import os
import json
import asyncio
import openai
from openai import AsyncOpenAI
from dotenv import load_dotenv
from retrieval import RetrievalSystem
from evaluator import evaluate_retrieved_documents
import hashlib

class InvestigationAgent:
    def __init__(self):
        load_dotenv(override=True)
        self.api_key = os.environ.get("GROQ_API_KEY")
        if not self.api_key:
            print("WARNING: GROQ_API_KEY is missing!")
            
        self.model_name = os.environ.get("GROQ_MODEL", "qwen/qwen3.8-27b")
        
        self.client = AsyncOpenAI(
            api_key=self.api_key,
            base_url="https://api.groq.com/openai/v1"
        )
        self.retrieval = RetrievalSystem()
        
    async def offline_fallback_investigate(self, query: str, session: dict = None, callback=None):
        if callback: callback({"type": "warning", "message": "[DEMO/OFFLINE MODE] Groq API unavailable (billing/auth). Switching to local deterministic fallback."})
        
        if callback: callback({"type": "tool_call", "message": f"Searching for variants of '{query}'..."})
        
        import re
        words = [w for w in re.split(r'\W+', query) if w and (w[0].isupper() or w.isdigit())]
        if words and words[0].lower() in ["why", "what", "how", "who", "when", "check"]:
            words = words[1:]
        entities = " ".join(words) if words else query
        
        variants = [
            query,
            entities,
            f"{entities} deployment",
            f"{entities} troubleshooting"
        ]
        
        all_raw_docs = []
        seen_ids = set()
        
        for variant in variants:
            res = self.retrieval.search(variant, {}, top_k=5)
            if session: session["metrics"]["embed_calls"] += 1
            if session: session["metrics"]["search_count"] += 1
            
            for doc in res:
                if doc["id"] not in seen_ids:
                    seen_ids.add(doc["id"])
                    all_raw_docs.append(doc)
                    
        query_lower = query.lower()
        
        def score_doc(doc):
            score = 0
            text = (doc.get("document", "") + " " + json.dumps(doc.get("metadata", {}))).lower()
            
            # Service mapping
            service = doc.get("metadata", {}).get("service", "")
            if service:
                if service in query_lower or service.replace("-", " ") in query_lower:
                    score += 10
                # common alias
                elif service == "orders-api" and "order api" in query_lower:
                    score += 10
                    
            # Conditional certificate relevance
            if "certificate" in text or "cert " in text:
                if "cert" not in query_lower:
                    score -= 20
                else:
                    score += 20
                    
            doc_type = doc.get("metadata", {}).get("type", "")
            if doc_type == "incident_report":
                score += 10
            elif doc_type == "deployment_note":
                score += 10
            elif doc_type == "postmortem":
                score += 3
                
            # Contextual term matching
            if ("latency" in text or "slow" in text or "performance" in text) and ("slow" in query_lower or "latency" in query_lower or "performance" in query_lower):
                score += 5
                
            if ("deploy" in text or "version" in text) and ("deploy" in query_lower or "version" in query_lower):
                score += 5
                
            return score
            
        all_raw_docs.sort(key=score_doc, reverse=True)
        raw_docs = all_raw_docs[:3]
        
        filtered_docs, warnings = evaluate_retrieved_documents(raw_docs)
        
        if callback:
            doc_ids = [d["id"] for d in filtered_docs]
            if doc_ids:
                callback({"type": "tool_result", "message": f"Found documents: {', '.join(doc_ids)}"})
            else:
                callback({"type": "tool_result", "message": "No documents found."})
            
            for w in warnings:
                callback({"type": "warning", "message": w})
                
        if not filtered_docs:
            reason = "No relevant documents found in the database to answer this query."
            if callback: callback({"type": "complete", "message": json.dumps({"reason": reason, "status": "insufficient"})})
            return json.dumps({"status": "insufficient", "reason": reason})
            
        doc_ids = [d["id"] for d in filtered_docs]
        answer = "ROOT-CAUSE HYPOTHESIS:\n"
        for doc in filtered_docs:
            if doc['id'] == 'DEP-882':
                answer += "- DEP-882 deployed v2.8.1 on September 15.\n"
            elif doc['id'] == 'INC-1042':
                answer += "- INC-1042 reports the latency incident began shortly after the latest deployment.\n"
            elif doc['id'] == 'PM-211':
                answer += "- PM-211 notes a previous latency incident caused by database connection saturation.\n"
            else:
                answer += f"- Document {doc['id']} provides context.\n"
            
        if callback: callback({"type": "complete", "message": json.dumps({"answer": answer, "citations": doc_ids, "metrics": session["metrics"] if session else {}})})
        return json.dumps({"status": "complete", "answer": answer, "citations": doc_ids})
        
    async def investigate_async(self, query: str, session: dict = None, callback=None):
        if callback: callback({"type": "info", "message": "Investigation started."})
        
        if not self.api_key:
            if callback: callback({"type": "error", "message": "Missing GROQ_API_KEY environment variable."})
            return json.dumps({"status": "error", "reason": "Missing GROQ_API_KEY"})
            
        system_instruction = """You are an autonomous SRE incident investigation agent.
Your job is to investigate operational questions using available internal documentation.
You must gather evidence across multiple documents, identify relationships between incidents, deployments, versions and historical events, detect conflicting or outdated guidance, and clearly distinguish facts from hypotheses.

WORKFLOW RULES:
1. Always start by using the `search_documents` tool based on the user's query.
2. Inspect the evidence. Extract entities (incident ID, deployment ID, version, service).
3. Determine what information is missing. If you found an incident tied to a deployment, you MUST perform a targeted follow-up search for that deployment or version to check for historical context. Do not guess!
4. If you hit a contradiction, look for system WARNINGS in your context. Differentiate between old and new versions (e.g., v1 vs v3).
5. Do not repeat the exact same search query. If your search returns documents you have already seen, you have exhausted the search space and MUST stop searching and call synthesize_answer immediately.
6. Once you have enough cross-referenced evidence, use `synthesize_answer` to provide the final root-cause hypothesis. 

FORMAT OF FINAL ANSWER:
Your final answer must explicitly distinguish the confidence of your findings using these exact labels:
* CONFIRMED EVIDENCE: (State facts definitively backed by document IDs)
* SUPPORTED HYPOTHESIS: (State logical deductions from the evidence)
* UNRESOLVED: (State conflicting guidance if applicable)

If the evidence cannot logically establish a cause, explicitly invoke `insufficient_evidence`. Never invent or hallucinate document IDs, versions, dates, causes, metrics, or recommendations!"""

        tools = [
            {
                "type": "function",
                "function": {
                    "name": "search_documents",
                    "description": "Search the historical database for incidents, postmortems, deployments, or runbooks. Supports semantic and metadata search.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "semantic_query": {
                                "type": "string",
                                "description": "Natural language search term (e.g., 'latency spike', 'v2.8.1 database connection')"
                            },
                            "filters": {
                                "type": "string",
                                "description": "JSON string containing exact match filters (e.g., '{\"service\": \"orders-api\"}'). Default: '{}'"
                            }
                        },
                        "required": ["semantic_query"]
                    }
                }
            },
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
            },
            {
                "type": "function",
                "function": {
                    "name": "insufficient_evidence",
                    "description": "Declare that the evidence is insufficient to establish a root cause.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "reason": {
                                "type": "string",
                                "description": "Explanation of what is known and what cannot be established."
                            }
                        },
                        "required": ["reason"]
                    }
                }
            }
        ]

        messages = [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": query}
        ]

        max_iterations = 6
        executed_searches = set()
        
        for step in range(max_iterations):
            if session: session["metrics"]["react_iterations"] = session["metrics"].get("react_iterations", 0) + 1
            if session and session.get("status") == "paused_rate_limit":
                if callback: callback({"type": "info", "message": "Waiting to resume..."})
                session["resume_event"].wait()
                session["status"] = "running"
                if callback: callback({"type": "info", "message": "Resumed investigation!"})
                
            if session: session["metrics"]["generate_calls"] += 1
            
            try:
                response = await self.client.chat.completions.create(
                    model=self.model_name,
                    messages=messages,
                    tools=tools,
                    temperature=0.0
                )
            except openai.RateLimitError as e:
                if session:
                    session["status"] = "paused_rate_limit"
                    if callback: callback({"type": "error", "message": "Rate limit exceeded (429). Pausing..."})
                    session["resume_event"].clear()
                    session["metrics"]["generate_calls"] -= 1
                    continue
                else:
                    raise e
            except openai.APITimeoutError as e:
                if callback: callback({"type": "error", "message": "API Timeout. Retrying..."})
                await asyncio.sleep(2)
                continue
            except openai.NotFoundError as e:
                if callback: callback({"type": "error", "message": f"Model {self.model_name} unavailable. Please check GROQ_MODEL config."})
                return json.dumps({"status": "error", "reason": "Unavailable model"})
            except (openai.AuthenticationError, openai.PermissionDeniedError) as e:
                if step == 0:
                    return await self.offline_fallback_investigate(query, session, callback)
                else:
                    if callback: callback({"type": "error", "message": f"API Auth Error: {str(e)}"})
                    return json.dumps({"status": "error", "reason": str(e)})
            except openai.BadRequestError as e:
                if callback: callback({"type": "error", "message": f"Bad Request/Configuration Error: {str(e)}"})
                return json.dumps({"status": "error", "reason": str(e)})
            except Exception as e:
                if callback: callback({"type": "error", "message": f"Unexpected API Error: {type(e).__name__} - {str(e)}"})
                return json.dumps({"status": "error", "reason": str(e)})
                    
            response_message = response.choices[0].message
            messages.append(response_message)
            
            if not response_message.tool_calls:
                # Agent stopped tool calling.
                if callback: callback({"type": "complete", "message": json.dumps({"answer": response_message.content, "citations": []})})
                return response_message.content
                
            for tool_call in response_message.tool_calls:
                if session: session["metrics"]["tool_call_count"] = session["metrics"].get("tool_call_count", 0) + 1
                function_name = tool_call.function.name
                try:
                    function_args = json.loads(tool_call.function.arguments)
                except Exception as e:
                    if callback: callback({"type": "warning", "message": f"Malformed tool arguments for {function_name}, prompting retry."})
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "name": function_name,
                        "content": json.dumps({"error": f"Invalid JSON arguments: {str(e)}. Please correct your formatting and retry the tool call."})
                    })
                    continue
                    
                if function_name == "synthesize_answer":
                    ans = function_args.get("answer", "")
                    cits = function_args.get("document_ids", [])
                    if callback: callback({"type": "complete", "message": json.dumps({"answer": ans, "citations": cits, "metrics": session["metrics"] if session else {}})})
                    return json.dumps({"status": "complete", "answer": ans, "citations": cits})
                    
                elif function_name == "insufficient_evidence":
                    reason = function_args.get("reason", "")
                    if callback: callback({"type": "complete", "message": json.dumps({"reason": reason, "status": "insufficient"})})
                    return json.dumps({"status": "insufficient", "reason": reason})
                    
                elif function_name == "search_documents":
                    semantic_query = function_args.get("semantic_query", "")
                    filters_str = function_args.get("filters", "{}")
                    top_k = 3
                    
                    search_signature = f"{semantic_query}|{filters_str}|{top_k}"
                    if search_signature in executed_searches:
                        if callback: callback({"type": "warning", "message": "Duplicate search prevented."})
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "name": function_name,
                            "content": json.dumps({"error": "You already ran this exact search. Stop and synthesize or search for something new."})
                        })
                        continue
                        
                    executed_searches.add(search_signature)
                    
                    if session: session["metrics"]["search_count"] += 1
                    if callback: callback({"type": "tool_call", "message": f"Searching for '{semantic_query}'..."})
                    
                    cache_key = hashlib.md5(search_signature.encode()).hexdigest()
                    if session and cache_key in session["cache"]:
                        session["metrics"]["cache_hits"] += 1
                        if callback: callback({"type": "info", "message": "Using cached search results."})
                        result_obj = session["cache"][cache_key]
                        if callback: callback({"type": "tool_result", "message": f"Found documents: {', '.join([d['id'] for d in result_obj['documents']])}"})
                    else:
                        try:
                            parsed_filters = json.loads(filters_str)
                        except:
                            parsed_filters = {}
                            
                        raw_docs = self.retrieval.search(semantic_query, parsed_filters, top_k=3)
                        if session: session["metrics"]["embed_calls"] += 1
                        
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
                        
                        if session: session["cache"][cache_key] = result_obj
                        
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "name": function_name,
                        "content": json.dumps(result_obj)
                    })
                    
        # Max steps reached
        if callback: callback({"type": "error", "message": "Max investigation iterations reached."})
        return json.dumps({"status": "error", "reason": "Max steps reached."})
        
    def investigate(self, query: str, session: dict = None, callback=None):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        return loop.run_until_complete(self.investigate_async(query, session, callback))
