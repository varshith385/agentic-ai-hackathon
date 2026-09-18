from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
from sse_starlette.sse import EventSourceResponse
import uuid
import json
from agent import InvestigationAgent

app = FastAPI(title="Incident Investigation Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class InvestigateRequest(BaseModel):
    query: str

sessions = {}

@app.post("/investigate")
async def investigate_start(request: InvestigateRequest):
    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "query": request.query,
        "queue": asyncio.Queue(),
        "thread_started": False
    }
    return {"session_id": session_id}

@app.get("/stream/{session_id}")
async def investigate_stream(session_id: str):
    if session_id not in sessions:
        return {"error": "Invalid session"}
        
    session = sessions[session_id]
    queue = session["queue"]
    query = session["query"]
    
    async def event_generator():
        # define a threadsafe callback
        loop = asyncio.get_running_loop()
        
        def sync_callback(event_data):
            # Schedule putting into the queue safely from another thread
            if not loop.is_closed():
                try:
                    loop.call_soon_threadsafe(queue.put_nowait, json.dumps(event_data))
                except RuntimeError:
                    pass
            
        # Run agent in background thread
        def run_agent():
            try:
                agent = InvestigationAgent()
                res = agent.investigate(query, callback=sync_callback)
            except Exception as e:
                sync_callback({"type": "error", "message": str(e)})
            finally:
                sync_callback({"type": "done"})
                
        if not session["thread_started"]:
            session["thread_started"] = True
            import threading
            t = threading.Thread(target=run_agent)
            t.start()
        
        try:
            while True:
                data = await queue.get()
                data_dict = json.loads(data)
                yield {"data": data}
                if data_dict.get("type") in ["done", "error"]:
                    break
        except asyncio.CancelledError:
            # Client disconnected, gracefully terminate SSE
            pass
                
    return EventSourceResponse(event_generator())
