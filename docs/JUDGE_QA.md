# Judge Q&A

### 1. What problem are you solving?
In large-scale distributed systems, incident resolution is blocked by "tribal knowledge." Engineers waste hours trying to connect alerts to recent deployments, historical postmortems, or conflicting runbooks. We are solving MTTR (Mean Time to Resolution) by introducing an autonomous investigation agent that dynamically links symptoms, software versions, and historical records.

### 2. Why can't normal search solve this?
Normal search relies on exact keyword matches. If an incident says "Order API latency", a normal search won't automatically realize it needs to look up the exact deployment version that happened 2 hours prior, nor will it correlate that version with a database postmortem from 6 months ago. Our agent dynamically performs multi-hop reasoning.

### 3. Why isn't this just RAG?
Traditional RAG (Retrieval-Augmented Generation) is single-shot: User asks a question -> System searches once -> LLM summarizes. 
Our system is **Agentic**. The LLM decides *what* to search, reads the results, identifies missing links (like a software version), decides to search *again*, and repeats until it proves the root cause or hits a contradiction.

### 4. What makes this agentic?
The system is non-deterministic in its execution path but bounded by its toolset. It orchestrates its own actions based on the evidence it uncovers. It is not a hard-coded script; it is a dynamic loop of Observation -> Reasoning -> Action.

### 5. What decisions does the agent make?
- Deciding which semantic keywords to search.
- Deciding which metadata filters (like service name) to apply.
- Deciding if the current evidence is sufficient to declare a root cause.
- Deciding if a deployment version needs to be cross-referenced with historical bugs.
- Deciding to declare "Insufficient Evidence" if the dots don't connect.

### 6. How does the agent perform multi-hop investigation?
We use the ReAct (Reasoning and Acting) pattern via the Gemini SDK. The agent is provided with tools. When it encounters a document like a deployment note, its system instruction mandates that it extract the version number and execute a *new* search tool call to hunt for bugs specific to that version.

### 7. What tools does the agent use?
1. `search_documents`: Performs semantic + metadata retrieval against our historical incident database.
2. `synthesize_answer`: Outputs the final, evidence-backed conclusion.
3. `insufficient_evidence`: A safe fallback to prevent hallucinations when facts don't align.

### 8. How does retrieval work?
We use ChromaDB. When a document is ingested, it is embedded using `gemini-embedding-2`. When the agent searches, the query is embedded live, and ChromaDB performs an approximate nearest neighbor (ANN) search to find semantically similar documents, optionally filtered by strict metadata rules.

### 9. Why semantic + metadata-aware retrieval?
Semantic search understands that "latency spike" is similar to "slow performance". Metadata filtering ensures we only look at "orders-api" documents, preventing the agent from conflating a database issue in the "catalog-api" with the current incident.

### 10. How do you handle document dates?
We implemented a strict, deterministic `evaluator.py` interceptor. Before the agent even sees the search results, the evaluator mathematically sorts troubleshooting guides by date and injects hard warnings if older documents contradict newer ones.

### 11. How do you handle software versions?
Similar to dates, the evaluator parses semantic versioning (e.g., `v2.8.1`). If the agent retrieves a runbook for `v1.0` but the current deployment is `v2.8`, the evaluator flags it, forcing the agent to prioritize recency.

### 12. How do you detect contradictions?
By combining deterministic logic with LLM reasoning. The retrieval evaluator flags date/version discrepancies, and the Gemini agent explicitly reads these warnings to recognize that "Restart Service A" (2024) is superseded by "Do NOT restart Service A" (2026).

### 13. How do you distinguish similar incidents from the same incident?
The agent is explicitly prompted to "Check the service and versions!" If two incidents look similar but apply to different microservices or lack a connecting deployment, the agent uses the `insufficient_evidence` tool rather than guessing.

### 14. How do you reduce hallucination?
- **Strict Grounding:** The agent can only synthesize answers using citations from `search_documents`.
- **Evaluator Warnings:** Deterministic guardrails intercept bad evidence before it reaches the LLM.
- **Low Temperature:** The LLM is set to `temperature=0.1` to prioritize highly analytical, factual outputs over creative guessing.

### 15. What happens if evidence is insufficient?
The agent calls the `insufficient_evidence` tool, which cleanly reports to the UI that no root cause could be confidently determined, explaining exactly what information was missing.

### 16. What happens if Gemini fails?
We implemented robust backend lifecycles. For `503 Unavailable` spikes, we use the `tenacity` library to perform exponential backoff retries. For `429 Rate Limit` exhaustion, we intercept the crash and stream a clean, graceful error to the UI without dropping the connection.

### 17. What happens if a tool/API fails?
The background thread catches the exception and streams a fatal `{"type": "error"}` event to the frontend via Server-Sent Events (SSE), gracefully terminating the loading state so the user is never left hanging.

### 18. Why Gemini?
Gemini 1.5 Flash provides the perfect balance of speed, massive context windows, and native tool-calling capabilities required for rapid, multi-hop operational investigations.

### 19. Why ChromaDB?
ChromaDB is a lightweight, open-source vector database that runs locally. It perfectly supports both dense vector embeddings and strict metadata filtering out of the box, making it ideal for a hackathon implementation of an enterprise architecture.

### 20. Why FastAPI?
FastAPI provides native asynchronous support, which is critical for handling non-blocking Server-Sent Events (SSE) streams, allowing us to stream the agent's thought process to the frontend in real-time.

### 21. Why React?
React's component-based architecture and state management make it trivial to handle real-time SSE updates, dynamically rendering the investigation trace and final citations as they stream in.

### 22. Why not use multiple agents?
A single, highly capable agent with properly scoped tools reduces latency and architectural complexity. For this specific use case, a single agent performing a recursive ReAct loop is faster and more reliable than passing messages between a "Search Agent" and an "Analysis Agent".

### 23. How would this scale?
- **Database:** ChromaDB can be swapped for a managed vector database (like Pinecone or Google Cloud Vector Search).
- **Compute:** The FastAPI backend is entirely stateless (sessions are just memory queues for active SSE streams) and can be horizontally scaled behind a load balancer using Redis Pub/Sub for cross-worker event broadcasting.

### 24. How would this work with thousands/millions of documents?
We would implement a pre-filtering step using an inverted index (Elasticsearch) to narrow down documents by `service_id` or `timestamp` before applying vector search (Hybrid Search), ensuring we don't scan millions of irrelevant vectors.

### 25. What would production architecture look like?
Production would ingest real-time alerts from Datadog/PagerDuty via webhooks. The agent would trigger automatically upon an alert, execute the investigation against a production Vector Search cluster, and post the root cause directly into the Slack incident channel before an engineer even opens their laptop.

### 26. What are the current limitations?
The primary limitation is the Gemini Free Tier quota (5 requests per minute). We implemented a 12-second artificial sleep inside the tools to bypass this, but a production system on a paid tier would run the multi-hop investigation in seconds.

### 27. What makes this different from a generic chatbot?
A generic chatbot waits for the user to ask a question, generates text, and stops. This system is an **autonomous worker**. It takes a high-level goal, formulates its own sub-queries, executes them against a database, evaluates the results, loops back to fix its own knowledge gaps, and only returns when the job is done.

### 28. What is the strongest part of the system?
The deterministic `evaluator.py` interceptor working in tandem with the non-deterministic LLM. It proves we aren't just blindly trusting AI; we are actively applying software engineering guardrails to AI reasoning.

### 29. What would you build next with more time?
I would integrate an execution tool allowing the agent to automatically query live metrics (e.g., "Run PromQL query to check Order API CPU usage") to cross-reference historical postmortems with live telemetry data.
