import time
import asyncio
from voice_engine.conversational_agent import ConversationalRecoveryAgent

a = ConversationalRecoveryAgent()
t0 = time.time()
res = asyncio.run(a.generate_response('Aarav', 'ACC-1', 45000, 'Hindi', [], 'i will pay u tomorrow', 'CONTINUE'))
print('Time:', time.time() - t0)
print('Response:', res)
