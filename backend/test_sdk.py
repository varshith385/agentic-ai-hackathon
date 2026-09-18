import os
from google import genai
from google.genai import types

from dotenv import load_dotenv
load_dotenv()
api_key = os.environ.get("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

def dummy_tool(x: str) -> str:
    print("DUMMY TOOL CALLED")
    return "Dummy result"

chat = client.chats.create(
    model="gemini-3.6-flash",
    config=types.GenerateContentConfig(tools=[dummy_tool])
)

import tenacity

attempt = 0

@tenacity.retry(
    retry=tenacity.retry_if_exception_type(Exception),
    stop=tenacity.stop_after_attempt(2)
)
def run():
    global attempt
    attempt += 1
    if attempt == 1:
        print("First attempt - triggering fake exception before calling API")
        raise Exception("Fake 429")
    print("Second attempt - calling API")
    return chat.send_message("Use the dummy tool.")

try:
    run()
except Exception as e:
    pass

print("Final history length:", len(chat.get_history()))
