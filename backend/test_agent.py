import os
import json
from dotenv import load_dotenv
load_dotenv()

from agent import InvestigationAgent

def mock_callback(event):
    print(f"[{event.get('type', 'INFO').upper()}] {event.get('message')}")

def run_test():
    agent = InvestigationAgent()
    
    queries = [
        "Why did the Order API become slow on September 16? Check whether the deployment was related and whether we have seen this before.",
        "What is the troubleshooting procedure for restarting Service A?"
    ]
    
    for i, q in enumerate(queries):
        print(f"\n{'='*50}\nTEST {chr(65+i)}: {q}\n{'='*50}")
        try:
            res = agent.investigate(q, callback=mock_callback)
            print("\nFINAL ANSWER:")
            print(res)
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    run_test()
