from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class SafetyAction(str, Enum):
    CONTINUE = "CONTINUE"
    PAUSE = "PAUSE"
    HUMAN_HANDOFF = "HUMAN_HANDOFF"
    STOP_CONTACT = "STOP_CONTACT"
    SUPERVISOR_REVIEW = "SUPERVISOR_REVIEW"
    SAFE_TERMINATION = "SAFE_TERMINATION"


class SafetyEvaluationInput(BaseModel):
    # Explicit borrower requests
    borrower_requested_human: bool = False
    borrower_requested_stop_contact: bool = False
    borrower_disputed_debt: bool = False
    borrower_reported_harassment: bool = False
    borrower_reported_vulnerability: bool = False
    
    # Acoustic & paralinguistic state
    consecutive_distress_windows: int = 0
    acoustic_agitation_flag: bool = False
    is_emotion_model_uncertain: bool = False
    consecutive_uncertain_windows: int = 0
    
    # System & call limits
    call_duration_seconds: float = 0.0
    max_duration_seconds: float = 480.0
    collector_talk_ratio: float = 0.50
    consecutive_interruption_count: int = 0
    
    # Human handoff availability
    human_collector_available: bool = True


class SafetyDecisionResult(BaseModel):
    action: SafetyAction
    reason_code: str
    plain_language_reason: str
    severity: str # 'INFO', 'WARNING', 'CRITICAL'
    requires_event_audit: bool = True
    context: Dict[str, Any] = Field(default_factory=dict)


class DeterministicSafetyEngine:
    """
    Pure, testable deterministic safety policy engine.
    Rules strictly outrank collection or conversational AI objectives.
    LLM outputs can NEVER suppress, reinterpret, or bypass these rules.
    """

    def __init__(
        self,
        distress_persistence_threshold: int = 3,
        uncertainty_persistence_threshold: int = 4,
        max_duration_seconds: float = 600.0,
        max_collector_talk_ratio: float = 0.75,
        max_consecutive_interruptions: int = 4
    ):
        self.distress_persistence_threshold = distress_persistence_threshold
        self.uncertainty_persistence_threshold = uncertainty_persistence_threshold
        self.max_duration_seconds = max_duration_seconds
        self.max_collector_talk_ratio = max_collector_talk_ratio
        self.max_consecutive_interruptions = max_consecutive_interruptions

    def evaluate(self, state: SafetyEvaluationInput) -> SafetyDecisionResult:
        """
        Evaluates current interaction state against immutable hierarchical safety rules.
        Highest severity rules are evaluated first.
        """
        # Rule 1: Legal Stop-Contact or Harassment Assertion
        if state.borrower_requested_stop_contact or state.borrower_reported_harassment:
            return SafetyDecisionResult(
                action=SafetyAction.STOP_CONTACT,
                reason_code="BORROWER_STOP_CONTACT_ASSERTION",
                plain_language_reason="Borrower explicitly requested stop-contact or reported harassment. Immediate cessation mandated.",
                severity="CRITICAL",
                context={"stop_contact": True}
            )

        # Rule 2: Explicit Human Agent Request
        if state.borrower_requested_human:
            if state.human_collector_available:
                return SafetyDecisionResult(
                    action=SafetyAction.HUMAN_HANDOFF,
                    reason_code="BORROWER_REQUESTED_HUMAN",
                    plain_language_reason="Borrower explicitly requested to speak with a human representative.",
                    severity="WARNING",
                    context={"fallback_used": False}
                )
            else:
                return SafetyDecisionResult(
                    action=SafetyAction.SAFE_TERMINATION,
                    reason_code="HUMAN_UNAVAILABLE_SAFE_CALLBACK",
                    plain_language_reason="Borrower requested human representative, but none are currently available. Terminating pressure politely and queueing priority human callback.",
                    severity="WARNING",
                    context={"fallback_used": True, "action": "SCHEDULE_CALLBACK"}
                )

        # Rule 3: Debt Dispute or Grievance
        if state.borrower_disputed_debt:
            return SafetyDecisionResult(
                action=SafetyAction.SUPERVISOR_REVIEW,
                reason_code="DISPUTED_DEBT_CLAUSE",
                plain_language_reason="Borrower formally disputed debt validity. Pausing automated pressure for verification.",
                severity="WARNING",
                context={"dispute": True}
            )

        # Rule 4: Sustained Acoustic Distress
        if state.consecutive_distress_windows >= self.distress_persistence_threshold:
            if state.human_collector_available:
                return SafetyDecisionResult(
                    action=SafetyAction.HUMAN_HANDOFF,
                    reason_code="SUSTAINED_ACOUSTIC_DISTRESS",
                    plain_language_reason=f"Sustained acoustic distress detected across {state.consecutive_distress_windows} audio windows. Collection pressure halted.",
                    severity="CRITICAL",
                    context={"distress_windows": state.consecutive_distress_windows}
                )
            else:
                return SafetyDecisionResult(
                    action=SafetyAction.SAFE_TERMINATION,
                    reason_code="DISTRESS_SAFE_TERMINATION",
                    plain_language_reason="Sustained borrower distress with no human collector available. Gracefully terminating call to protect borrower well-being.",
                    severity="CRITICAL",
                    context={"distress_windows": state.consecutive_distress_windows}
                )

        # Rule 5: Extended Model Uncertainty / Telephony Signal Loss
        if state.consecutive_uncertain_windows >= self.uncertainty_persistence_threshold:
            return SafetyDecisionResult(
                action=SafetyAction.PAUSE,
                reason_code="MODEL_SIGNAL_UNCERTAINTY",
                plain_language_reason="Acoustic emotion model confidence below safe threshold or severe signal degradation. Failsafe conservative pause applied.",
                severity="WARNING",
                context={"uncertain_windows": state.consecutive_uncertain_windows}
            )

        # Rule 6: Prohibited Collector Dominance or Threatening Overlap
        if state.consecutive_interruption_count >= self.max_consecutive_interruptions:
            return SafetyDecisionResult(
                action=SafetyAction.SUPERVISOR_REVIEW,
                reason_code="EXCESSIVE_INTERRUPTIONS",
                plain_language_reason="Repeated speech collisions / aggressive interruption pattern flagged for supervisor review.",
                severity="WARNING",
                context={"interruption_count": state.consecutive_interruption_count}
            )

        # Rule 7: Call Duration Exceeded
        if state.call_duration_seconds >= self.max_duration_seconds:
            return SafetyDecisionResult(
                action=SafetyAction.SAFE_TERMINATION,
                reason_code="CALL_DURATION_EXCEEDED",
                plain_language_reason="Call reached maximum allowed contact window. Concluding interaction politely.",
                severity="INFO",
                context={"duration": state.call_duration_seconds}
            )

        # Default: Safe to Continue Bounded Interaction
        return SafetyDecisionResult(
            action=SafetyAction.CONTINUE,
            reason_code="SAFE_NOMINAL",
            plain_language_reason="Interaction parameters within safe regulatory boundaries.",
            severity="INFO",
            requires_event_audit=False
        )
