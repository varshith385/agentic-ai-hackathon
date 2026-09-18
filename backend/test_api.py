import requests
import json
import sseclient

def test_api():
    # Start investigation
    payload = {"query": "Why did the Order API become slow after the September 16 deployment? Check whether the deployment was related."}
    r = requests.post("http://127.0.0.1:8000/investigate", json=payload)
    if r.status_code != 200:
        print("Failed to start:", r.text)
        return
        
    session_id = r.json()["session_id"]
    print("Started session:", session_id)
    
    # Stream the results
    response = requests.get(f"http://127.0.0.1:8000/stream/{session_id}", stream=True)
    client = sseclient.SSEClient(response)
    
    for event in client.events():
        print(f"[{event.event}] {event.data}")
        
        # Stop listening if complete or error
        if event.event in ["complete", "error"]:
            break

if __name__ == "__main__":
    test_api()
