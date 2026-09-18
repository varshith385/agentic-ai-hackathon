import requests
import json
import sseclient
import sys

def test_query(query):
    print(f"\nTesting Query: {query}", flush=True)
    try:
        res = requests.post("http://127.0.0.1:8001/investigate", json={"query": query}, timeout=10)
        res.raise_for_status()
        session_id = res.json()["session_id"]
        
        response = requests.get(f"http://127.0.0.1:8001/stream/{session_id}", stream=True)
        client = sseclient.SSEClient(response)
        
        for event in client.events():
            if event.data:
                data = json.loads(event.data)
                print(f"[EVENT] {data['type']}: {data.get('message', '')}", flush=True)
                if data["type"] == "complete" or data["type"] == "error":
                    break
    except Exception as e:
        print(f"Error: {e}", flush=True)

if __name__ == "__main__":
    test_query("Why did the Order API become slow on September 16? Was it related to the latest deployment?")
