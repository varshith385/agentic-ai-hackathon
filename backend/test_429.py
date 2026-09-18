import asyncio
import json
import threading
from agent import InvestigationAgent
import openai
import httpx
import time
from main import sessions, resume_investigation

async def test_429():
    agent = InvestigationAgent()
    
    # Mock the client
    original_create = agent.client.chat.completions.create
    
    call_count = 0
    async def mock_create(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            # First call simulates rate limit
            print("\n[MOCK] Simulating 429 RateLimitError...")
            
            # Create a mock httpx.Response
            mock_response = httpx.Response(
                429,
                headers={
                    "retry-after": "5",
                    "x-ratelimit-reset-requests": "12s",
                    "x-ratelimit-reset-tokens": "2.5s"
                },
                request=httpx.Request("POST", "https://api.groq.com/openai/v1/chat/completions")
            )
            
            raise openai.RateLimitError(
                message="Rate limit exceeded",
                response=mock_response,
                body=None
            )
        else:
            print("\n[MOCK] Simulating normal response on resume...")
            # Return a valid mock response
            class MockMessage:
                content = json.dumps({
                    "action": "synthesize_answer",
                    "action_input": "Test complete."
                })
                tool_calls = [] # fix the AttributeError
            class MockChoice:
                message = MockMessage()
            class MockResponse:
                choices = [MockChoice()]
            return MockResponse()

    agent.client.chat.completions.create = mock_create
    
    session = {
        "status": "pending",
        "resume_event": threading.Event(),
        "metrics": {"generate_calls": 0},
        "trace": []
    }
    
    events_received = []
    def mock_callback(event):
        print(f"Callback received: {event}")
        events_received.append(event)
        
    print("\n--- Starting Investigation ---")
    
    # We must run it using the sync investigate method just like main.py
    # so threading.Event().wait() blocks correctly.
    def run_agent():
        agent.investigate("Order API latency", session, mock_callback)
        
    t = threading.Thread(target=run_agent)
    t.start()
    
    # Give it time to hit the error and pause
    await asyncio.sleep(1)
    
    print(f"\nSession status: {session['status']}")
    rate_limit_event = next((e for e in events_received if e["type"] == "rate_limit"), None)
    
    if rate_limit_event:
        print(f"\nSUCCESS: Caught rate_limit event: {rate_limit_event}")
    else:
        print("\nFAILED: No rate_limit event emitted.")
        
    
    print("\n--- Simulating Premature Resume ---")
    session_id = "test-session-123"
    sessions[session_id] = session
    
    # Try resuming immediately (before 12s cooldown expires)
    res = await resume_investigation(session_id)
    print(f"Premature resume response: {res}")
    
    print(f"\n--- Simulating Post-Cooldown Resume ---")
    # Fast-forward time by manually setting rate_limit_until to past
    session["rate_limit_until"] = time.time() - 1
    
    res = await resume_investigation(session_id)
    print(f"Post-cooldown resume response: {res}")
    
    t.join()
    
    print(f"\nFinal session status: {session['status']}")

if __name__ == "__main__":
    asyncio.run(test_429())
