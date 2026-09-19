import asyncio
import json
import os
from openai import AsyncOpenAI
from dotenv import load_dotenv

async def check():
    load_dotenv(override=True)
    client = AsyncOpenAI(
        api_key=os.environ.get("GROQ_API_KEY"),
        base_url="https://api.groq.com/openai/v1"
    )
    
    tools = [
        {
            "type": "function",
            "function": {
                "name": "synthesize_answer",
                "description": "Provide the final evidence-backed answer to the user.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "answer": {
                            "type": "string",
                            "description": "Your final detailed explanation following the requested confidence format."
                        },
                        "document_ids": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "List of document IDs used as evidence."
                        }
                    },
                    "required": ["answer", "document_ids"]
                }
            }
        }
    ]
    
    # Let's provide enough context to force a long response
    messages = [
        {"role": "system", "content": "You are a very verbose assistant. Generate a huge paragraph of at least 500 words to answer the prompt, and call the synthesize_answer tool."},
        {"role": "user", "content": "Explain the entire history of the database latency incident INC-1042 and the DEP-882 deployment in extreme detail."}
    ]
    
    print("Calling API...")
    res = await client.chat.completions.create(
        model="qwen/qwen3.8-27b",
        messages=messages,
        tools=tools,
        temperature=0.0
    )
    
    choice = res.choices[0]
    print("Finish Reason:", choice.finish_reason)
    if choice.message.tool_calls:
        print("Tool Call Answer length:", len(choice.message.tool_calls[0].function.arguments))
        args = json.loads(choice.message.tool_calls[0].function.arguments)
        print("Truncated?", args.get('answer', '')[-20:])
    else:
        print("Content:", choice.message.content)
        
    print("Usage:", res.usage)

if __name__ == "__main__":
    asyncio.run(check())
