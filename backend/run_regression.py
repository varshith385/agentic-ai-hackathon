import sys
import json
import time
from agent import InvestigationAgent
import traceback

queries = {
    "C": "What evidence connects INC-1042 with DEP-882?",
    "D": "Was v2.6.0 deployed on September 15?",
    "E": "What is the capital of India?"
}

def dummy_callback(event):
    if event["type"] == "tool_call":
        print(f"  [SEARCH] {event['message']}")
    elif event["type"] == "tool_result":
        print(f"  [EVIDENCE] {event['message']}")
    elif event["type"] == "warning":
        print(f"  [WARNING] {event['message']}")

def main():
    agent = InvestigationAgent()
    
    for test_id, query in queries.items():
        print(f"\n{'='*50}\nTEST {test_id}: {query}\n{'='*50}")
        
        while True:
            try:
                res_str = agent.investigate(query, session=None, callback=dummy_callback)
                res = json.loads(res_str)
                print(f"\n[RESULT STATUS]: {res.get('status')}")
                if "answer" in res:
                    print(f"[ANSWER]:\n{res['answer']}")
                elif "reason" in res:
                    print(f"[REASON]:\n{res['reason']}")
                    
                if "citations" in res:
                    print(f"[CITATIONS]: {res['citations']}")
                break # success, move to next test
                
            except Exception as e:
                if "RateLimitError" in str(type(e)):
                    print(f"[RATE LIMIT] Waiting 60 seconds...")
                    time.sleep(60)
                else:
                    print(f"[ERROR]: {e}")
                    traceback.print_exc()
                    break

if __name__ == "__main__":
    main()
