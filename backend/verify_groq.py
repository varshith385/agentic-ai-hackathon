import os
import json
import asyncio
from agent import InvestigationAgent
from dotenv import load_dotenv

load_dotenv()

def run_test():
    print("=== 1. Package check ===")
    import openai
    print(f"OpenAI version: {openai.__version__}")
    
    print("\n=== 2/3/4. Agent Config ===")
    agent = InvestigationAgent()
    print("GROQ_API_KEY loaded:", bool(agent.api_key))
    print("GROQ_MODEL:", agent.model_name)
    
    print("\n=== 5/6/7/8. Minimal Groq ReAct API Call ===")
    
    def my_callback(msg):
        print(f"[CALLBACK] {msg['type'].upper()}: {msg.get('message', '')}")
        
    print("Calling investigate...")
    session_data = {
        "status": "running",
        "resume_event": asyncio.Event(),
        "metrics": {"generate_calls": 0, "embed_calls": 0, "search_count": 0, "cache_hits": 0},
        "cache": {}
    }
    
    try:
        result = agent.investigate("Why did the Order API become slow on September 16? Just search once.", session=session_data, callback=my_callback)
        print("\n[FINAL RESULT]")
        print(result)
        
        print("\n[METRICS]")
        print(json.dumps(session_data["metrics"], indent=2))
    except Exception as e:
        print("Investigation failed:", e)

if __name__ == "__main__":
    run_test()
