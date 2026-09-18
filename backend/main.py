from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
from sse_starlette.sse import EventSourceResponse
import uuid
import json
import threading
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
        "status": "pending",
        "trace": [],
        "resume_event": threading.Event(),
        "cache": {},
        "metrics": {
            "generate_calls": 0,
            "embed_calls": 0,
            "search_count": 0,
            "cache_hits": 0
        }
    }
    return {"session_id": session_id}

@app.post("/resume/{session_id}")
async def resume_investigation(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session = sessions[session_id]
    if session["status"] != "paused_rate_limit":
        return {"status": "Already " + session["status"]}
        
    session["status"] = "running"
    session["resume_event"].set()
    
    resume_evt = {"type": "info", "message": "Investigation resumed."}
    session["trace"].append(resume_evt)
    
    try:
        session["queue"].put_nowait(json.dumps(resume_evt))
    except Exception:
        pass
        
    return {"status": "resumed"}

@app.get("/stream/{session_id}")
async def investigate_stream(session_id: str):
    if session_id not in sessions:
        return {"error": "Invalid session"}
        
    session = sessions[session_id]
    queue = session["queue"]
    
    async def event_generator():
        # Replay historical trace
        for evt in session["trace"]:
            yield {"data": json.dumps(evt)}
            
        if session["status"] in ["completed", "failed"]:
            return

        loop = asyncio.get_running_loop()
        
        def sync_callback(event_data):
            # Only append to trace if it's not a done event, done is transient for stream close
            if event_data.get("type") != "done":
                session["trace"].append(event_data)
                
            if not loop.is_closed():
                try:
                    loop.call_soon_threadsafe(queue.put_nowait, json.dumps(event_data))
                except RuntimeError:
                    pass
                    
        def run_agent():
            try:
                agent = InvestigationAgent()
                agent.investigate(session["query"], session=session, callback=sync_callback)
            except Exception as e:
                session["status"] = "failed"
                sync_callback({"type": "error", "message": str(e)})
            finally:
                if session["status"] not in ["paused_rate_limit", "failed"]:
                    session["status"] = "completed"
                sync_callback({"type": "done"})
                
        if session["status"] == "pending":
            session["status"] = "running"
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
            pass
                
    return EventSourceResponse(event_generator())
