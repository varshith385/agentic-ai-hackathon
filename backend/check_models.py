import os
import requests
from dotenv import load_dotenv

load_dotenv()
api_key = os.environ.get("GROQ_API_KEY")

if not api_key:
    print("NO API KEY")
    exit()

headers = {
    "Authorization": f"Bearer {api_key}"
}

try:
    response = requests.get("https://api.groq.com/openai/v1/models", headers=headers)
    if response.status_code == 200:
        models = response.json().get("data", [])
        for m in models:
            print(f"- {m['id']}")
    else:
        print(f"Failed to fetch models: {response.status_code} {response.text}")
except Exception as e:
    print("Error:", e)
