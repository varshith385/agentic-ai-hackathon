import asyncio
import json
import os
from openai import AsyncOpenAI
from dotenv import load_dotenv
from agent import InvestigationAgent

async def run_trace():
    agent = InvestigationAgent()
    query = "Why did the Order API become slow on September 16, and what evidence connects the incident to the latest deployment?"
    
    print("=== STARTING TRACE ===")
    
    def my_callback(msg):
        print(f"CALLBACK: {msg['type']} -> {msg['message'][:200]}")
    
    session = {
        "metrics": {"generate_calls": 0, "embed_calls": 0, "search_count": 0, "cache_hits": 0, "tool_call_count": 0, "react_iterations": 0},
        "status": "running",
        "cache": {},
        "resume_event": asyncio.Event()
    }
    
    res = await agent.investigate_async(query, session, callback=my_callback)
    
    print("=== FINAL BACKEND RESULT ===")
    print(res)

if __name__ == "__main__":
    asyncio.run(run_trace())
