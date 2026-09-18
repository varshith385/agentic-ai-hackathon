import requests
import json
import sseclient
import time

def test_query(query):
    print(f"\n========================================")
    print(f"TEST: {query}")
    print(f"========================================")
    
    try:
        res = requests.post("http://127.0.0.1:8001/investigate", json={"query": query}, timeout=10)
        res.raise_for_status()
        session_id = res.json()["session_id"]
        
        response = requests.get(f"http://127.0.0.1:8001/stream/{session_id}", stream=True)
        client = sseclient.SSEClient(response)
        
        for event in client.events():
            if event.data:
                data = json.loads(event.data)
                msg_type = data["type"]
                msg = data.get("message", "")
                
                if msg_type == "tool_result":
                    print(f"  [RESULT] {msg}")
                elif msg_type == "tool_call":
                    print(f"  [SEARCH] {msg}")
                elif msg_type == "warning":
                    print(f"  [ALERT] {msg}")
                elif msg_type == "rate_limit":
                    print(f"  [RATE LIMIT PAUSED] {msg}")
                    break
                elif msg_type == "error":
                    print(f"  [ERROR] {msg}")
                    break
                elif msg_type == "info":
                    print(f"  [INFO] {msg}")
                elif msg_type == "complete":
                    payload = json.loads(msg)
                    if payload.get("status") == "out_of_scope":
                        print(f"\n[OUT OF SCOPE]")
                    else:
                        print(f"\n[FINAL ANSWER]")
                    break
                
    except Exception as e:
        print(f"  [EXCEPTION] {e}")

if __name__ == "__main__":
    test_query("What evidence connects INC-1042 with DEP-882?")
    test_query("What is the capital of India?")
