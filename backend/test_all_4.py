import requests
import json
import sseclient

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
                
                if msg_type == "complete":
                    payload = json.loads(msg)
                    if payload.get("status") == "out_of_scope":
                        print(f"\n[OUT OF SCOPE]")
                        print(payload.get("answer"))
                    elif payload.get("status") == "insufficient":
                        print(f"\n[INSUFFICIENT EVIDENCE]")
                        print(payload.get("reason"))
                    else:
                        print(f"\n[FINAL ANSWER]")
                        print(payload.get("answer"))
                        print(f"\n[CITATIONS] {payload.get('citations')}")
                    break
                
    except Exception as e:
        print(f"  [EXCEPTION] {e}")

if __name__ == "__main__":
    test_query("Why did the Order API become slow on September 16, and what evidence connects the incident to the latest deployment?")
    test_query("Could the previous database issue explain the current latency?")
    test_query("What evidence connects INC-1042 with DEP-882?")
    test_query("What is the capital of India?")
