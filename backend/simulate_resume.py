import requests
import json
import sseclient
import time

res = requests.post("http://127.0.0.1:8000/investigate", json={"query": "Why did the Order API become slow on September 16? Check whether the deployment was related."})
sid = res.json()["session_id"]
print(f"Session initialized: {sid}")

print("\n--- FIRST CONNECTION ---")
r = requests.get(f"http://127.0.0.1:8000/stream/{sid}", stream=True)
client = sseclient.SSEClient(r)
for event in client.events():
    data = json.loads(event.data)
    print(data)
    if data.get("type") == "error" and "429" in data.get("message", ""):
        print("--- Caught 429 Pause Event! Disconnecting ---")
        r.close()
        break
    if data.get("type") in ["done", "error"]:
        print("--- Unexpected termination ---")
        r.close()
        break

print("\n--- WAITING 3 SECONDS ---")
time.sleep(3)

print("\n--- CALLING RESUME ---")
resume_res = requests.post(f"http://127.0.0.1:8000/resume/{sid}")
print("Resume response:", resume_res.json())

print("\n--- RECONNECTING TO STREAM ---")
r2 = requests.get(f"http://127.0.0.1:8000/stream/{sid}", stream=True)
client2 = sseclient.SSEClient(r2)
for event in client2.events():
    data = json.loads(event.data)
    print(data)
    if data.get("type") in ["done", "error", "complete"]:
        if data.get("type") == "complete":
            print("--- INVESTIGATION COMPLETE! ---")
        break
