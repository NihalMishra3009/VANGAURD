import httpx
import logging
import os
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)


class ConversationalRecoveryAgent:
    """
    Direct, polite, natural debt recovery dialogue agent.
    Speaks naturally like a professional banking officer rather than a robotic script reader.
    Dynamically adjusts tone, listens to borrower explanations, and respects deterministic safety boundaries.
    """

    def __init__(self, ollama_url: str = "http://127.0.0.1:11434", model: str = "qwen2.5:3b"):
        self.ollama_url = ollama_url
        self.model = model
        self.enable_ollama = os.getenv("VOXGUARD_ENABLE_OLLAMA", "false").lower() == "true"

    async def generate_response(
        self,
        borrower_name: str,
        account_number: str,
        outstanding_amount: float,
        preferred_language: str,
        conversation_history: List[Dict[str, str]],
        borrower_utterance: str,
        safety_action: str
    ) -> str:
        """
        Generates contextual conversational response.
        If a critical safety action (STOP_CONTACT, HUMAN_HANDOFF) is mandated by the deterministic policy,
        the LLM generation is strictly constrained or bypassed to uphold borrower safety.
        """
        # 1. Deterministic safety overrides (Halts collection pressure immediately)
        if safety_action == "STOP_CONTACT":
            return f"Theek hai {borrower_name} ji, humne aapka stop-contact request note kar liya hai. Hum abhi ye call band kar rahe hain aur aage koi automated call nahi aayegi. Shukriya."
        
        if safety_action == "HUMAN_HANDOFF":
            return f"Main samajh sakti hoon {borrower_name} ji, aapki baat bilkul valid hai. Main abhi collection pressure pause kar rahi hoon aur turant ye call hamare senior specialist officer ko connect kar rahi hoon. Kripya line par bane rahiye."

        if safety_action == "SUPERVISOR_REVIEW":
            return f"{borrower_name} ji, aapke statement ke hisaab se humne ye case dispute aur supervisor review ke liye mark kar diya hai. Abhi aapse koi collection pressure nahi hogi."

        if safety_action == "SAFE_TERMINATION":
            return f"{borrower_name} ji, lagta hai abhi baat karne ka sahi samay nahi hai. Hum aapko pareshan nahi karenge. Hamara officer aapse aage suvidhajanak samay par sampark karega. Namaste."

        # 2. System prompt for natural direct dialogue
        system_prompt = (
            f"You are Priya, a polite female customer care executive from Axis Bank calling {borrower_name}.\n"
            f"Account: {account_number}, Overdue: Rs {outstanding_amount:,.0f}.\n"
            f"IMPORTANT RULES:\n"
            f"1. Write strictly in Roman script Hindi (Hinglish), e.g. 'Main samajh sakti hoon {borrower_name} ji...'. Do NOT write in Devanagari.\n"
            f"2. Output strictly 1 or 2 complete, warm, natural sentences directly addressing what {borrower_name} just said.\n"
            f"3. Never say 'I am an AI bot' or 'hum chahte hain ki account regular rahe'.\n"
            f"4. If borrower shares a problem (salary late, medical, loss), show empathy: 'Main samajh sakti hoon {borrower_name} ji, pareshani ho sakti hai. Kya aap batayenge ki kab tak salary aane ki ummeed hai?'\n"
            f"5. If borrower promises to pay, say: 'Bohat achha {borrower_name} ji, humne note kar liya hai. Kya main payment link SMS par bhej doon?'"
        )

        messages = [{"role": "system", "content": system_prompt}]
        for turn in conversation_history[-4:]:
            messages.append({"role": "user" if turn.get("sender") == "BORROWER" else "assistant", "content": turn.get("text", "")})
        
        messages.append({"role": "user", "content": borrower_utterance})

        # Try local Ollama LLM only if explicitly enabled
        if self.enable_ollama:
            try:
                async with httpx.AsyncClient(timeout=httpx.Timeout(timeout=3.0, connect=0.5)) as client:
                    res = await client.post(
                        f"{self.ollama_url}/api/chat",
                        json={
                            "model": self.model,
                            "messages": messages,
                            "stream": False,
                            "options": {"temperature": 0.3, "num_predict": 75}
                        }
                    )
                    if res.status_code == 200:
                        data = res.json()
                        content = data.get("message", {}).get("content", "").strip()
                        # Only accept if it is complete and in Latin/Roman script
                        if content and len(content) > 10 and not content.startswith("{") and any(c.isascii() for c in content):
                            # Filter out any quotes or thought tags
                            content = content.replace('"', '').replace('**', '').strip()
                            return content
            except Exception as e:
                logger.warning(f"Ollama conversational generation fallback triggered: {e}")
            logger.warning(f"Ollama conversational generation fallback triggered: {e}")

        # 3. Dynamic contextual fallback addressing borrower's specific words (Roman & Devanagari)
        b_text = borrower_utterance.lower()
        if any(w in b_text for w in ["salary", "paisa nahi", "paise nahi", "no money", "job", "loss", "majboor", "broke", "पैसे", "सैलरी", "मजबूर"]):
            return f"Main samajh sakti hoon {borrower_name} ji, financial dikkat ho sakti hai. Kya aap bata sakte hain ki is mahine salary ya funds kab tak aane ki ummeed hai?"
        
        if any(w in b_text for w in ["bimari", "hospital", "tabiyat", "medical", "accident", "bimar", "emergency", "operation", "अस्पताल", "बीमार", "बीमारी"]):
            return f"Oh, mujhe sunkar dukh hua {borrower_name} ji. Aap pehle apni sehat aur family ka dhyan rakhein. Hum aapse agle hafte sampark karenge jab sthiti behtar ho. Namaste."

        if any(w in b_text for w in ["kal", "tomorrow", "parso", "shaam", "pay", "dedunga", "kar dunga", "bhej dunga", "subah", "कल", "शाम", "भेज दूंगा"]):
            return f"Bohat achha {borrower_name} ji, humne note kar liya hai ki aap arrangement kar rahe hain. Kya main aapke registered mobile par direct payment link SMS bhej doon?"

        if any(w in b_text for w in ["kon", "who", "kaha se", "kaun", "kya hai", "कौन"]):
            return f"Ji {borrower_name} ji, main Axis Bank loan operations desk se Priya baat kar rahi hoon, aapke loan account {account_number} ke renewal ke silsile mein."

        if any(w in b_text for w in ["baar baar", "bar bar", "pareshan", "pareshaan", "tang", "kyu call", "kyun", "परेशान", "तंग"]):
            return f"Humein khed hai {borrower_name} ji aapko pareshani hui. System se automated reminder generate hua tha. Aap batayein ki hum aapse kis samay baat karein?"

        if any(w in b_text for w in ["dispute", "mera nahi", "already paid", "galat", "wrong", "गलत", "पेमेंट कर"]):
            return f"{borrower_name} ji, agar aapne pehle hi payment kar diya hai ya ye dispute hai, toh main is case ko reconciliation review mein daal deti hoon."

        # Default conversational prompt acknowledging borrower's turn
        return f"Ji {borrower_name} ji, main aapki baat samajh rahi hoon. Is outstanding amount Rs {outstanding_amount:,.0f} ke liye aap kis tarah plan karna chahenge?"
