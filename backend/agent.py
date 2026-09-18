import os
import json
from google import genai
from google.genai import types, errors
from retrieval import RetrievalSystem
from evaluator import evaluate_retrieved_documents
import tenacity
import hashlib

class InvestigationAgent:
    def __init__(self):
        api_key = os.environ.get("GEMINI_API_KEY")
        if api_key:
            self.client = genai.Client(api_key=api_key)
        else:
            self.client = genai.Client()
            
        self.retrieval = RetrievalSystem()
        
    def investigate(self, query: str, session: dict = None, callback=None):
        if callback: callback({"type": "info", "message": "Investigation started."})
        
        system_instruction = """You are an autonomous Incident Investigation Agent.
Your job is to investigate operational incidents. You have access to a database of historical documents.
You must use the search_documents tool to find information.
If you find a document that mentions a deployment, you MUST search for that deployment to get its version.
Do not assume similar symptoms mean the same incident. Check the service and versions!
If you hit a contradiction, look for system WARNINGS in your context.
If you cannot connect the evidence logically, use the insufficient_evidence tool.
If you have the final answer, use the synthesize_answer tool.
CRITICAL RULE: You must solve the problem using a MAXIMUM of 2 search queries total to conserve API quota.
"""
        
        def search_documents(semantic_query: str, filters: str = "{}") -> str:
            """
            Search the historical database.
            semantic_query: The natural language search term (e.g., "latency spike")
            filters: A JSON string containing exact match filters (e.g., {"service": "orders-api", "type": "deployment_note"})
            """
            if session:
                session["metrics"]["search_count"] += 1
                
            if callback: callback({"type": "tool_call", "message": f"Searching for '{semantic_query}'..."})
            
            # Caching to avoid duplicate LLM/Embedding calls
            cache_key = hashlib.md5((semantic_query + filters).encode()).hexdigest()
            if session and cache_key in session["cache"]:
                session["metrics"]["cache_hits"] += 1
                if callback: callback({"type": "info", "message": "Using cached search results."})
                cached_result = session["cache"][cache_key]
                if callback:
                    callback({"type": "tool_result", "message": f"Found documents: {', '.join([d['id'] for d in cached_result['documents']])}"})
                return json.dumps(cached_result)
            
            try:
                parsed_filters = json.loads(filters)
            except:
                parsed_filters = {}
                
            raw_docs = self.retrieval.search(semantic_query, parsed_filters, top_k=3)
            if session:
                session["metrics"]["embed_calls"] += 1
                
            filtered_docs, warnings = evaluate_retrieved_documents(raw_docs)
            
            if callback:
                doc_ids = [d["id"] for d in filtered_docs]
                if doc_ids:
                    callback({"type": "tool_result", "message": f"Found documents: {', '.join(doc_ids)}"})
                else:
                    callback({"type": "tool_result", "message": "No documents found."})
                
                for w in warnings:
                    callback({"type": "warning", "message": w})
            
            result_obj = {
                "documents": filtered_docs,
                "warnings": warnings
            }
            
            if session:
                session["cache"][cache_key] = result_obj
                
            return json.dumps(result_obj)

        def synthesize_answer(answer: str, document_ids: list[str]) -> str:
            """
            Use this when you have successfully investigated the root cause and can answer the user's query.
            answer: Your final explanation.
            document_ids: A list of document IDs you used as evidence.
            """
            if callback: callback({"type": "complete", "message": json.dumps({"answer": answer, "citations": document_ids})})
            return json.dumps({"status": "complete", "answer": answer, "citations": document_ids})
            
        def insufficient_evidence(reason: str) -> str:
            """
            Use this if you have searched but cannot logically connect the evidence or find a definitive answer.
            reason: Why the evidence is insufficient.
            """
            if callback: callback({"type": "complete", "message": json.dumps({"reason": reason, "status": "insufficient"})})
            return json.dumps({"status": "insufficient", "reason": reason})

        chat = self.client.chats.create(
            model="gemini-3.6-flash",
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                tools=[search_documents, synthesize_answer, insufficient_evidence],
                temperature=0.1
            )
        )
        
        class PauseOnRateLimitWait(tenacity.wait.wait_base):
            def __init__(self, session, callback):
                self.session = session
                self.callback = callback
                
            def __call__(self, retry_state):
                exc = retry_state.outcome.exception()
                if isinstance(exc, errors.ClientError) and "429" in str(exc):
                    if self.session:
                        self.session["status"] = "paused_rate_limit"
                        if self.callback: 
                            self.callback({"type": "error", "message": "Rate limit exceeded (429). Pausing..."})
                        
                        # Freeze the thread in memory until resumed
                        self.session["resume_event"].clear()
                        self.session["resume_event"].wait()
                        
                    return 0.1 # Wait 0.1s after unblocking before actual retry
                return 2 # Default wait for 503 errors

        def is_retryable(exc):
            if isinstance(exc, errors.ServerError):
                return True
            if isinstance(exc, errors.ClientError) and "429" in str(exc):
                return True
            return False

        @tenacity.retry(
            retry=tenacity.retry_if_exception(is_retryable),
            wait=PauseOnRateLimitWait(session, callback),
            stop=tenacity.stop_after_attempt(5),
            reraise=True
        )
        def send_with_retry():
            if session:
                session["metrics"]["generate_calls"] += 1
                if session["metrics"]["generate_calls"] == 2:
                    raise errors.ClientError("429 Fake Rate Limit Exceeded")
            return chat.send_message(query)

        try:
            response = send_with_retry()
            return response.text
        except Exception as e:
            if callback: callback({"type": "error", "message": str(e)})
            raise e
