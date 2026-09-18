import os
from dotenv import load_dotenv
load_dotenv()

from agent import InvestigationAgent
import json

def mock_callback(event):
    print(f"[{event.get('type', 'INFO').upper()}] {event.get('message')}")

def run_test():
    agent = InvestigationAgent()
    
    # Query with no possible related documents
    query = "Why did the Flux Capacitor fail in 1985 causing a temporal paradox?"
    
    print(f"\n{'='*50}\nTEST INSUFFICIENT EVIDENCE: {query}\n{'='*50}")
    
    # Mock retrieval to simulate no relevant documents found (since ChromaDB returns top-k regardless of distance)
    original_search = agent.retrieval.search
    agent.retrieval.search = lambda *args, **kwargs: []
    
    res = agent.investigate(query, callback=mock_callback)
    
    # Restore
    agent.retrieval.search = original_search
    
    print("\nFINAL RESULT JSON:")
    print(res)
    
    try:
        res_dict = json.loads(res)
        if res_dict.get("status") == "insufficient":
            print("\nPASS: System correctly identified insufficient evidence.")
        else:
            print(f"\nFAIL: Expected status 'insufficient', got '{res_dict.get('status')}'")
    except Exception as e:
        print(f"FAIL: Could not parse result: {e}")

if __name__ == "__main__":
    run_test()
