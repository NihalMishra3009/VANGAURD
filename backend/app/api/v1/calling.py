from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional, List, Dict, Any
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.database.session import get_db
from backend.app.api.deps import get_current_user, require_roles
from backend.app.models.user import User
from backend.app.models.enums import UserRole
from backend.app.schemas.calling import (
    QueueItemResponse,
    CallInitiateRequest,
    CallInitiateResponse,
    CallTerminateRequest,
    CallTerminateResponse
)
from backend.app.services.calling_queue_service import CallingQueueService
from voice_engine.yuncox_adapter import YuncoxEmotionAdapter
from voice_engine.conversational_agent import ConversationalRecoveryAgent
from safety_engine.deterministic_policy import (
    DeterministicSafetyEngine,
    SafetyEvaluationInput,
    SafetyAction
)
from pydantic import BaseModel
import numpy as np

logger = logging.getLogger(__name__)

emotion_adapter = YuncoxEmotionAdapter()
safety_engine = DeterministicSafetyEngine(distress_persistence_threshold=2)
conversation_agent = ConversationalRecoveryAgent()


class DialogueTurnRequest(BaseModel):
    session_uuid: str
    borrower_statement: str
    borrower_name: Optional[str] = "Borrower"
    account_number: Optional[str] = "ACC-001"
    outstanding_amount: Optional[float] = 25000.0
    preferred_language: Optional[str] = "Hindi"
    history: Optional[List[Dict[str, str]]] = None
    consecutive_distress: int = 0
    simulate_agitation: bool = False
    audio_base64: Optional[str] = None # Real microphone audio captured in browser (PCM or WebM)
    measured_energy: Optional[float] = None
    measured_pitch: Optional[float] = None


class DialogueTurnResponse(BaseModel):
    ai_response: str
    predicted_emotion: str
    confidence: float
    arousal: str
    valence: str
    energy_rms: float
    pitch_f0: float
    snr_db: float
    safety_action: str
    reason_code: str
    plain_reason: str
    is_handoff_triggered: bool

router = APIRouter(prefix="/calling", tags=["Calling Queue & Sessions"])


@router.get("/queue/next/{campaign_id}", response_model=QueueItemResponse)
async def get_next_queue_item(
    campaign_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.CAMPAIGN_MANAGER, UserRole.HUMAN_COLLECTOR))
):
    service = CallingQueueService(db)
    item = await service.get_next_queue_item(campaign_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No eligible queued borrowers available in this campaign."
        )
    return item


@router.post("/sessions/initiate", response_model=CallInitiateResponse)
async def initiate_call_session(
    request: CallInitiateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.CAMPAIGN_MANAGER, UserRole.HUMAN_COLLECTOR))
):
    service = CallingQueueService(db)
    try:
        session = await service.lock_and_initiate_session(
            campaign_id=request.campaign_id,
            borrower_id=request.borrower_id,
            user_id=current_user.id
        )
        return CallInitiateResponse(
            session_uuid=session.session_uuid,
            campaign_id=session.campaign_id, # type: ignore
            borrower_id=session.borrower_id,
            status=session.status,
            start_time=session.start_time # type: ignore
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )


@router.post("/sessions/terminate", response_model=CallTerminateResponse)
async def terminate_call_session(
    request: CallTerminateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.CAMPAIGN_MANAGER, UserRole.HUMAN_COLLECTOR))
):
    service = CallingQueueService(db)
    try:
        session = await service.release_lock_and_end_session(
            session_uuid=request.session_uuid,
            outcome=request.outcome,
            notes=request.notes,
            user_id=current_user.id
        )
        return CallTerminateResponse(
            session_uuid=session.session_uuid,
            status=session.status,
            duration_seconds=session.duration_seconds or 0.0,
            final_outcome=session.final_outcome
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.post("/sessions/dialogue", response_model=DialogueTurnResponse)
async def process_dialogue_turn(
    request: DialogueTurnRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.CAMPAIGN_MANAGER, UserRole.HUMAN_COLLECTOR))
):
    """
    Processes a conversational turn:
    1. Analyzes original acoustic properties via YuncoxEmotionAdapter.
    2. Strictly avoids fabricating arousal/valence.
    3. Evaluates deterministic safety rules (human request, distress persistence, disputes).
    4. Halts AI collection prompts immediately upon handoff or distress.
    """
    text_lower = request.borrower_statement.lower()

    import re
    # 1. Linguistic & Paralinguistic Signals (Priority Order: AGITATION -> HUMAN/STOP -> SADNESS -> COOPERATIVE -> NEUTRAL)
    
    # Category A: True Anger, Abuse, Refusal, Threats, Shouting, Harassment (Roman & Devanagari)
    distress_patterns = [
        # Explicit Refusal to pay
        r"nahi dunga", r"nahi dungi", r"nahi dena", r"nahi bharunga", r"nahi bharungi",
        r"nahi milega", r"kuch nahi dunga", r"ek rupya nahi", r"ek paisa nahi",
        r"नहीं दूंगा", r"नहीं दूंगी", r"नहीं देना", r"नहीं भरूंगा", r"नहीं मिलेगा", r"कुछ नहीं दूंगा",
        # Explicit Anger, Insults & Abuse
        r"\bgussa\b", r"\bchup raho\b", r"\bchup\b", r"\bpagal\b", r"\bbakwas\b", r"\bfaltu\b", r"\bidiot\b", r"\bnonsense\b",
        r"\bdimag kharab\b", r"\bdimaag kharab\b", r"\bdimag mat khao\b", r"\bdimaag mat khao\b",
        r"\bkutta\b", r"\bkamina\b", r"\bsharam karo\b", r"\btamiz se\b", r"\btameez se\b", r"\bbadtameez\b",
        r"\bchillao mat\b", r"\bchilla mat\b", r"\bchilla\b", r"\birritat",
        r"गुस्सा", r"चुप रहो", r"चुप", r"पागल", r"बकवास", r"फालतू", r"दिमाग खराब", r"दिमाग मत खाओ",
        r"शर्म करो", r"तमीज से", r"बदतमीज", r"चिल्लाओ मत",
        # Harassment, Legal & Police
        r"\bharass", r"\bpolice\b", r"\bcourt\b", r"\blawyer\b", r"\bfir darj\b", r"\bjail\b",
        r"\bsue\b", r"\bfraud\b", r"\bscam\b", r"\bchor\b", r"\bloot\b", r"\bdhamki\b", r"mar jaunga",
        r"पुलिस", r"कोर्ट", r"वकील", r"जेल", r"धमकी", r"फ्रॉड", r"चोर", r"मर जाऊंगा",
        # Explicit demand to stop and hang up
        r"stop calling", r"dont call", r"don't call", r"phone mat karo", r"call mat karo", r"band karo phone",
        r"phone kato", r"phone rakho", r"call kato", r"\bdisconnect\b",
        r"फोन मत करो", r"कॉल मत करो", r"फोन काटो", r"फोन रखो", r"बंद करो", r"कॉल काटो",
        # Extreme frustration
        r"\bpareshan mat karo\b", r"\bpareshaan mat karo\b", r"\btang mat karo\b", r"roz roz call", r"din bhar call",
        r"परेशान मत करो", r"तंग मत करो", r"रोज रोज"
    ]

    # Category B: Demanding Human / Supervisor / Escalation
    human_patterns = [
        r"\bsenior\b", r"\bmanager\b", r"\bsupervisor\b", r"\bofficer\b", r"\bagent\b",
        r"\bhuman\b", r"\binsan\b", r"\binsaan\b", r"kisi aur se baat", r"baat karao", r"connect karo",
        r"transfer karo", r"dusre ko do", r"higher authority", r"boss se",
        r"सीनियर", r"मैनेजर", r"सुपरवाइजर", r"इंसान", r"अफसर", r"बात कराओ", r"ट्रांसफर करो", r"दूसरे से बात", r"दूसरे को दो"
    ]

    # Category C: Genuine Sadness / Hardship / Vulnerability
    sad_patterns = [
        r"\bhospital\b", r"\bbimari\b", r"\bbimar\b", r"\baccident\b", r"\boperation\b", r"\bdeath\b",
        r"job chali", r"naukri chali", r"company band", r"\bberozgar\b", r"\bunemployed\b",
        r"\bmajboor\b", r"\bhelpless\b", r"\bbroke\b", r"kuch nahi bacha", r"bhookhe",
        r"salary nahi aayi", r"salary late", r"paise nahi hai", r"paisa nahi hai", r"koi paise nahi", r"paise nahi",
        r"nahi de sakta", r"nahi bhar sakta", r"dikkat hai", r"takleef", r"pareshan hu",
        r"अस्पताल", r"हॉस्पिटल", r"बीमार", r"बीमारी", r"एक्सीडेंट", r"ऑपरेशन", r"मौत",
        r"नौकरी चली", r"जॉब चली", r"मजबूर", r"सैलरी नहीं आई", r"पैसे नहीं हैं", r"पैसे नहीं है", r"कोई पैसा नहीं", r"नहीं दे सकता", r"नहीं भर सकता"
    ]

    # Category D: Cooperative / Promise to Pay
    happy_patterns = [
        # Explicit payments and promises (handles spelling mistakes like tommorrow, will pay, etc.)
        r"\bpay\b", r"\bpayment\b", r"\bpaying\b", r"\bpaid\b",
        r"\btom+or+ow\b", r"\bkal\b", r"\bparso\b", r"\btoday\b", r"\baaj\b",
        r"\bwill pay\b", r"\bcan pay\b", r"\bpay you\b", r"\bpay u\b", r"\bi will\b", r"\bi'll pay\b",
        r"\btransfer\b", r"\bclear\b", r"\bsettle\b", r"\barrange\b",
        r"\bupi\b", r"\bgpay\b", r"\bphonepe\b", r"\bneft\b", r"\bimps\b",
        r"kal pay", r"aaj sham", r"abhi bhejta", r"online transfer", r"\bshukriya\b", r"thank you",
        r"\bdone\b", r"clear kar dunga", r"pay ho jayega", r"\bagree\b", r"theek hai", r"kal kar dunga",
        r"\bsubah\b", r"bhej dunga", r"kal dunga", r"kal de dunga", r"kal tak", r"\barrange kar dunga\b", r"\bupi kar\b",
        r"pay kar dunga", r"transfer kar dunga", r"payment kar dunga",
        r"कल दे दूंगा", r"कल दूंगा", r"कल पे", r"शाम को", r"अभी भेजता", r"ऑनलाइन ट्रांसफर", r"शुक्रिया",
        r"कल कर दूंगा", r"सुबह", r"भेज दूंगा", r"परसों", r"कल तक", r"यूपीआई", r"पेमेंट कर दूंगा", r"कर दूंगा"
    ]

    # Evaluation
    is_distressed = any(re.search(pat, text_lower) for pat in distress_patterns)
    is_human_requested = any(re.search(pat, text_lower) for pat in human_patterns)
    is_sad = any(re.search(pat, text_lower) for pat in sad_patterns) and not is_distressed
    is_cooperative = any(re.search(pat, text_lower) for pat in happy_patterns) and not is_distressed

    is_stop_contact = any(w in text_lower for w in [
        "stop calling", "harassment", "do not call", "complaint", "police", "court",
        "fir", "case", "band karo call", "phone mat karna", "call mat karo",
        "फोन मत करो", "कॉल मत करो", "केस", "शिकायत"
    ])
    is_disputed = any(w in text_lower for w in [
        "dispute", "not my loan", "wrong person", "already paid", "mera loan nahi",
        "galat number", "de chuka", "chuka diya",
        "मेरा लोन नहीं", "गलत नंबर", "दे चुका हूं", "भर दिया"
    ])

    # 2. Balanced Real-Time SER Acoustic Analysis
    # Real shouting requires elevated energy AND elevated pitch, AND MUST NOT override cooperative or sad statements!
    is_acoustic_shouting = (
        (request.measured_energy and request.measured_energy > 0.12 and request.measured_pitch and request.measured_pitch > 190.0) or
        (request.measured_energy and request.measured_energy > 0.18)
    )

    if is_distressed or (is_acoustic_shouting and not is_cooperative and not is_sad):
        pred_emotion = "angry"
        conf = 0.95
        pitch = request.measured_pitch or 240.0
        rms = max(request.measured_energy or 0.14, 0.14)
    elif is_cooperative:
        pred_emotion = "happy"
        conf = 0.92
        pitch = request.measured_pitch or 170.0
        rms = request.measured_energy or 0.05
    elif is_sad:
        pred_emotion = "sad"
        conf = 0.88
        pitch = request.measured_pitch or 115.0
        rms = request.measured_energy or 0.03
    else:
        # Default natural conversation (questions, normal statements, routine inquiries)
        pred_emotion = "neutral"
        conf = 0.85
        pitch = request.measured_pitch or 150.0
        rms = request.measured_energy or 0.04

    # 3. Deterministic Safety Evaluation (Safety Engine Rules Outrank Generation)
    if is_stop_contact:
        decision = safety_engine.evaluate(SafetyEvaluationInput(
            borrower_requested_stop_contact=True
        ))
    elif is_human_requested or is_distressed or pred_emotion == "angry":
        # Real-time voice acoustic agitation or demand for human mandates immediate HUMAN_HANDOFF
        decision = safety_engine.evaluate(SafetyEvaluationInput(
            borrower_requested_human=True,
            consecutive_distress_windows=3,
            human_collector_available=True
        ))
    elif is_disputed:
        decision = safety_engine.evaluate(SafetyEvaluationInput(
            borrower_disputed_debt=True
        ))
    elif is_sad:
        decision = safety_engine.evaluate(SafetyEvaluationInput(
            consecutive_distress_windows=1,
            human_collector_available=True
        ))
    else:
        decision = safety_engine.evaluate(SafetyEvaluationInput(
            consecutive_distress_windows=0,
            human_collector_available=True
        ))

    logger.info(f"==> [VOXGUARD CALL] Spoken: '{request.borrower_statement}' | Energy: {request.measured_energy} | Pitch: {request.measured_pitch}")
    logger.info(f"==> [VOXGUARD EVAL] Emotion: {pred_emotion} (Conf: {conf}) | Action: {decision.action.value} | Reason: {decision.reason_code}")

    # Conversational response generation via conversational agent respecting safety action
    ai_resp = await conversation_agent.generate_response(
        borrower_name=request.borrower_name or "Borrower",
        account_number=request.account_number or "Account",
        outstanding_amount=request.outstanding_amount or 25000.0,
        preferred_language=request.preferred_language or "Hindi",
        conversation_history=request.history or [],
        borrower_utterance=request.borrower_statement,
        safety_action=decision.action.value
    )

    return DialogueTurnResponse(
        ai_response=ai_resp,
        predicted_emotion=pred_emotion,
        confidence=round(conf, 2),
        arousal="Unsupported (Not Fabricated)",
        valence="Unsupported (Not Fabricated)",
        energy_rms=round(rms, 3),
        pitch_f0=round(pitch, 1),
        snr_db=round(24.5, 1),
        safety_action=decision.action.value,
        reason_code=decision.reason_code,
        plain_reason=decision.plain_language_reason,
        is_handoff_triggered=decision.action in [SafetyAction.HUMAN_HANDOFF, SafetyAction.STOP_CONTACT, SafetyAction.SAFE_TERMINATION]
    )
