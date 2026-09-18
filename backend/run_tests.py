import requests
import json
import sseclient
import time
import sys

queries = {
    "TEST A": "Why did the Order API become slow on September 16? Was it related to the latest deployment?",
    "TEST B": "What happened to the Order API on September 16?",
    "TEST C": "Why did the Order API fail due to a certificate expiration?",
    "TEST D": "Why did the Flux Capacitor fail in 1985 causing a temporal paradox?",
    "TEST E": "How do I restart the database? Is there any outdated guidance?"
}

def test_query(test_name, query):
    print(f"\n========================================")
    print(f"{test_name}: {query}")
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
                elif msg_type == "error":
                    print(f"  [ERROR] {msg}")
                    break
                elif msg_type == "complete":
                    payload = json.loads(msg)
                    if payload.get("status") == "insufficient":
                        print(f"\n[INSUFFICIENT EVIDENCE]")
                        print(payload.get("reason"))
                    else:
                        print(f"\n[FINAL ANSWER]")
                        print(payload.get("answer"))
                        print(f"\n[CITATIONS] {payload.get('citations')}")
                        print(f"\n[METRICS]")
                        print(json.dumps(payload.get("metrics"), indent=2))
                    break
                
    except Exception as e:
        print(f"  [EXCEPTION] {e}")

if __name__ == "__main__":
    for name, q in queries.items():
        test_query(name, q)
        time.sleep(3) # avoid rate limits
