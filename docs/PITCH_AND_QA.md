# SRE Operations Center — Hackathon Pitch & Q&A Preparation

## 1. PROJECT UNDERSTANDING

**Exact Problem:** During a production incident, SREs waste critical time manually searching across scattered systems (incident reports, deployment logs, runbooks, historical postmortems) to connect the dots and find a root cause.
**Why it matters:** Every minute of downtime costs money and damages user trust. Mean Time to Resolution (MTTR) is heavily bottlenecked by manual investigation, not just alert detection.
**Intended Users:** Site Reliability Engineers (SREs), DevOps Engineers, On-call Developers.
**Expected Solution:** An autonomous agent that can take a natural language query, search internal knowledge bases iteratively, connect related evidence (e.g., an incident to a deployment), evaluate conflicting information, and present an evidence-backed hypothesis.
**Current Implementation:**
- Python FastAPI backend with Server-Sent Events (SSE) streaming.
- Groq Cloud API running `qwen/qwen3.8-27b`.
- ReAct (Reasoning and Acting) loop for multi-hop investigation.
- Local embeddings (SentenceTransformers) + ChromaDB for vector retrieval.
- Deterministic evaluator for conflict detection.
- React/Vite cinematic frontend with distinct Live API and Replay Demo modes.
- Session state management with rate-limit pausing.
- Scope-checking to reject non-domain queries.
**Future Scope:** Live telemetry integration (Datadog/Prometheus), integration with live ticketing systems (Jira/PagerDuty), automated remediation execution.

---

## 2. 30-SECOND PITCH

"When an API suddenly becomes slow in production, the hardest part isn't detecting the alert—it's figuring out *why* it happened. Our project is the SRE Operations Center, an autonomous incident investigator. Instead of an engineer manually digging through scattered deployments, postmortems, and runbooks, our ReAct agent iteratively searches the internal knowledge base, connects related evidence, evaluates conflicting guidance, and streams a structured, evidence-backed root-cause hypothesis in seconds."

---

## 3. 60-SECOND PITCH

"When an API suddenly becomes slow in production, the hardest part isn't detecting the alert—it's figuring out *why* it happened. SREs waste critical minutes manually correlating scattered incident reports, deployment logs, and runbooks. 

Our project, the SRE Operations Center, solves this by acting as an autonomous incident investigator. Unlike a standard RAG chatbot, we built a true ReAct agent powered by Groq and a local ChromaDB vector store. It doesn't just search once. It takes a query, searches the knowledge base, observes the evidence, and formulates targeted follow-up searches to connect the dots—like linking a latency spike to a specific deployment version. 

We also built a deterministic evaluator that intercepts contradictory runbooks and ensures the final hypothesis is strictly grounded in retrieved citations. The result is faster Mean Time to Resolution through transparent, multi-hop, evidence-backed AI investigation."

---

## 4. COMPLETE 5-MEMBER PITCH (5-7 Minutes)

**MEMBER 1: Opening + Problem + Real-World Scenario**
"Hello, we are team [Name]. When an API suddenly becomes slow in production, the hardest part isn't getting the PagerDuty alert. The hardest part is figuring out *why* it happened. SREs waste critical minutes manually digging through scattered deployments, postmortems, and runbooks to connect the dots. Imagine an active incident: Order API latency spikes. An engineer has to find the incident report, check if a deployment happened recently, cross-reference previous postmortems, and read troubleshooting guides. Every minute lost is revenue lost. That's exactly the investigation gap our system addresses. I'll hand it over to Member 2, who will explain how our system performs this investigation autonomously."

**MEMBER 2: Solution + Workflow + Architecture**
"Thanks. Our solution is the SRE Operations Center—an autonomous incident investigator. The workflow is transparent. When a user asks an investigation question, the system first runs a deterministic scope check to ensure it's a valid operational query. Then, the investigation agent takes over. It formulates a search query, retrieves internal documents, and analyzes the metadata—like dates and service versions. If it needs more context to prove a connection, it performs a follow-up search. Finally, it synthesizes the data into Confirmed Evidence, a Supported Hypothesis, and explicitly flags what remains Unresolved. To explain the brain behind this, here is Member 3."

**MEMBER 3: Agent + Model + ReAct + Multi-hop Reasoning**
"Our agent is powered by Qwen running on Groq for ultra-fast inference. But what makes this truly agentic is that we aren't just using standard RAG. Standard RAG does a single retrieval and guesses the answer. We implemented a ReAct—Reasoning and Acting—loop. The model isn't given a fixed chain of searches. It receives the question and a search tool, performs an initial retrieval, observes the returned evidence, and decides if another targeted search is necessary. For example, it might find an incident report, see the version is v2.8.1, and autonomously decide to search for deployments matching that specific version. Member 4 will detail how we retrieve and evaluate this evidence."

**MEMBER 4: Retrieval + ChromaDB + Evidence + Contradiction Handling**
"For retrieval, we use ChromaDB with local embeddings. But semantic search isn't enough for SREs—versions and dates matter. We use a hybrid approach that considers document metadata like Service, Date, and ID. We also built a deterministic evaluator. If the agent retrieves two troubleshooting guides that conflict—say, an old v1 runbook vs a new v3 runbook—our evaluator intercepts the contradiction and forces the newer guidance to supersede. Furthermore, to prevent hallucinations, the final synthesis is strictly constrained to cite the retrieved document IDs, ensuring SREs can trace every claim. Now, Member 5 will demonstrate this live."

**MEMBER 5: Demo + Results + Limitations + Future Scope + Conclusion**
"Let's look at it in action. [Starts Demo]. I'll ask: *'Why did the Order API become slow on September 16?'* You can see the Server-Sent Events streaming the live trace. It searches, finds INC-1042, autonomously searches for a deployment, finds DEP-882, and correlates the September 15 deployment to the incident. Notice it clearly separates Confirmed Evidence from the Hypothesis. 
Currently, our limitation is that this prototype investigates a static document knowledge base. The future scope involves hooking this agent directly into live Datadog telemetry and Jira ticketing. Ultimately, we've built a fast, transparent, and evidence-grounded agent that acts as a true multiplier for Site Reliability Engineers. Thank you, we're ready for your questions."

---

## 5. 2-MINUTE EMERGENCY PITCH

"When a production API fails, SREs waste time manually correlating scattered incident reports and deployments. Our project, the SRE Operations Center, is an autonomous incident investigator that solves this. 
Unlike standard RAG, we built a true ReAct agent powered by Groq and ChromaDB. It performs multi-hop reasoning—it searches for an incident, observes the version, and autonomously searches again for matching deployments. We stream this entire investigation trace live via Server-Sent Events to a cinematic command center UI.
Crucially, our system uses a deterministic evaluator to handle conflicting runbooks, and strictly separates Confirmed Evidence from Hypothesis to prevent hallucinations. It doesn't just guess; it investigates and cites its sources, drastically reducing Mean Time to Resolution."

---

## 6. REAL-WORLD SCENARIO

**Scenario:** The Order API experiences severe latency. 
An SRE types: *"Why did the Order API become slow on September 16? Was it related to the latest deployment?"*
The agent retrieves INC-1042 (the latency report). It sees the version is v2.8.1. It autonomously searches for deployments and finds DEP-882 (v2.8.1 deployed on Sept 15). It then searches historical context and finds PM-211 (a similar incident in v2.6.0 caused by database saturation). 
The agent correctly connects the recent deployment to the incident, references the historical database issue, and provides a cited answer separating the confirmed timeline from the causal hypothesis.

---

## 7. SYSTEM WORKFLOW

USER QUESTION 
↓ 
DETERMINISTIC SCOPE CHECK (Rejects non-SRE questions)
↓ 
REACT AGENT LOOP 
↓ 
SEARCH TOOL CALL 
↓ 
CHROMADB SEMANTIC METADATA RETRIEVAL 
↓ 
OBSERVE EVIDENCE 
↓ 
AGENT DECIDES TO SEARCH AGAIN OR SYNTHESIZE 
↓ 
EVALUATOR INTERCEPTS CONTRADICTIONS 
↓ 
EVIDENCE-GROUNDED SYNTHESIS (Confirmed, Hypothesis, Unresolved)
↓ 
SSE STREAM TO FRONTEND

---

## 8. ARCHITECTURE EXPLANATION

```text
USER
 ↓
REACT FRONTEND (Vite / Tailwind)
 ↓
FASTAPI (SSE Streaming + Session State)
 ↓
REACT INVESTIGATION LOOP
 ↓
QWEN (via Groq API)
 ↓
TOOL EXECUTION (Search)
 ↓
CHROMADB (Local SentenceTransformers Embeddings)
 ↓
EVALUATOR (Conflict Detection)
 ↓
FINAL SYNTHESIS
 ↓
SSE
 ↓
FRONTEND (Cinematic Trace & Report)
```

---

## 9. HOW THE MODEL WORKS

"The model receives a system prompt that defines its persona as an SRE investigator and gives it access to a `search_knowledge_base` tool. It receives the user's query and outputs a JSON tool call. Our Python backend intercepts this, queries ChromaDB, and appends the retrieved documents back into the model's message history as a tool observation. The model then looks at this new history and decides its next action—either another search or generating a final answer."

---

## 10. WHY THIS IS AGENTIC

"A standard RAG chatbot takes a query, does a single database search, and generates an answer. It's static. 
Our system is an agent because it possesses a control loop. It performs an action (searching), observes the environment (reading the documents), and decides its next action based on that intermediate context. It can recognize missing links—like finding an incident but needing to search again for the related deployment—without human intervention."

---

## 11. HOW REACT WORKS

"ReAct stands for Reasoning and Acting. It interleaves thought processes with actions. In our code, the model generates a 'Thought' explaining what it needs to find, followed by an 'Action' which triggers our search tool. It then receives an 'Observation' back. This loop continues until the model determines it has sufficient evidence to fulfill the user's request."

---

## 12. RETRIEVAL + CHROMADB

"We use ChromaDB, an open-source vector database. Documents are chunked and stored alongside critical metadata (ID, Service, Date, Version). When the agent searches, we perform a semantic similarity search against the vectors. This is better than standard SQL because it understands the *meaning* of a query rather than relying on exact keyword matches."

---

## 13. EMBEDDINGS

"An embedding turns text into an array of numbers, representing its semantic meaning in a high-dimensional space. We use a local embedding model (`SentenceTransformers`). This means user queries and internal documents are embedded privately on our infrastructure, which is a major security benefit for sensitive SRE data."

---

## 14. EVALUATOR + CONTRADICTIONS

"Troubleshooting guides often go out of date. If the agent retrieves `GUIDE-12` (v1) and `GUIDE-41` (v3) which offer contradictory advice, our deterministic evaluator intercepts the retrieval result. It analyzes the version numbers and forces a warning that the newer document supersedes the older one, preventing the LLM from hallucinating bad advice."

---

## 15. EVIDENCE + HALLUCINATION CONTROL

"We don't guarantee zero hallucinations—no LLM can. However, we heavily mitigate them through strict evidence grounding. The model is explicitly prompted to separate its answer into Confirmed Evidence (strictly sourced facts) and Supported Hypotheses. It must cite document IDs (like `INC-1042`), allowing SREs to verify every claim."

---

## 16. INSUFFICIENT EVIDENCE

"If the user asks about an incident that isn't in our knowledge base, the agent shouldn't guess. We programmed an explicit 'Insufficient Evidence' state. If the retrieval returns nothing relevant, the loop terminates and reports that the knowledge base lacks the required facts. It explicitly states what is known and what remains unresolved."

---

## 17. SSE (Server-Sent Events)

"Because multi-hop investigation takes time, we use Server-Sent Events. Instead of making the user stare at a spinner for 10 seconds, the FastAPI backend streams JSON events (search started, documents found, evaluating) down to the React frontend. This renders our live vertical timeline, creating total transparency into the agent's thought process."

---

## 18. LIVE API VS REPLAY DEMO

"The Live API utilizes our actual Groq backend, executing dynamic ReAct loops and ChromaDB queries in real-time. 
Because conference WiFi and external APIs can be unreliable, we also built a 'Replay Demo' mode. This uses a deterministic, hardcoded sequence of SSE events to guarantee a flawless presentation of our exact workflow without relying on network conditions."

---

## 19. TECH STACK + WHY EACH TECHNOLOGY

- **Frontend:** React + Vite. *Why?* Fast compilation, component-based structure, easy state management for complex SSE streams.
- **Backend:** Python + FastAPI. *Why?* Native asynchronous support, perfect for SSE streaming and AI integrations.
- **AI:** Qwen on Groq. *Why?* Groq provides LPU-accelerated inference, making the multi-hop loop incredibly fast compared to standard GPU inference.
- **Retrieval:** ChromaDB + Local Embeddings. *Why?* Allows us to perform semantic search securely without sending document embeddings to a third-party API.

---

## 20. DEMO SCRIPT

**STEP 1:** Open application to the Cinematic UI.
**STEP 2:** Explain the difference between Live API and Replay Demo.
**STEP 3:** Ask: *"Why did the Order API become slow on September 16? Was it related to the latest deployment?"*
**STEP 4:** Click **START INVESTIGATION**.
**STEP 5:** Point out the Trace Timeline as it animates. Highlight the agent finding `INC-1042`, doing a second hop to find `DEP-882`, and seeing the dates match.
**STEP 6:** Show the final Investigation Report. Point out the clear separation of `CONFIRMED EVIDENCE`, `SUPPORTED HYPOTHESIS`, and `UNRESOLVED`.
**STEP 7:** Ask a contradiction question: *"Should I restart Service A during a latency spike?"*
**STEP 8:** Watch the trace flag a `KNOWLEDGE CONFLICT` between `GUIDE-12` and `GUIDE-41`, showing how the system handles outdated runbooks.

---

## 21. TEAM OF 5 ROLE SPLIT

*(Adjust based on actual team composition, this is a recommended distribution)*
- **MEMBER 1 (Product/Lead):** Hooks the judges, explains the SRE problem and the business impact.
- **MEMBER 2 (Backend/Architecture):** Explains the system architecture, FastAPI, and overall data flow.
- **MEMBER 3 (AI/Agentic):** Explains the ReAct loop, Groq, and what makes the system truly autonomous.
- **MEMBER 4 (Data/Retrieval):** Explains ChromaDB, metadata, embeddings, and the evaluator.
- **MEMBER 5 (Frontend/UX):** Drives the live demo, explains the cinematic UI, SSE, and handles Future Scope.

---

## 22. 60+ JUDGE QUESTIONS WITH ANSWERS

### A. Problem Statement & Real-world Use
**1. Who is the target user?** 
*Answer:* Site Reliability Engineers and DevOps teams managing complex microservices.
**2. How much time does this actually save?**
*Answer:* In major incidents, MTTR is often delayed by 15-30 minutes just correlating logs and deployments. We reduce that correlation to seconds.

### C. Workflow & Agentic Behavior
**3. Isn't this just RAG?**
*Answer:* No. Standard RAG does one search. Our agent has a control loop. It observes initial search results and formulates follow-up searches autonomously based on what it found.
**4. How does the agent know when to stop?**
*Answer:* The LLM is prompted to output a final synthesis when it believes it has sufficient evidence to answer the query, or when it exhausts its search paths.

### H. Retrieval & ChromaDB
**5. Why ChromaDB instead of standard SQL?**
*Answer:* Because SRE queries are semantic. "Order API became slow" needs to match "Latency spike on orders-api". SQL requires exact keyword matches.
**6. Why local embeddings?**
*Answer:* SRE data contains sensitive infrastructure details. Local embeddings ensure our vectors are generated on our infrastructure without sending internal data to OpenAI.

### L. Contradictions & Evidence
**7. What if two runbooks contradict?**
*Answer:* Our deterministic evaluator intercepts the retrieval. It compares versions (e.g., v1 vs v3) and explicitly flags the contradiction in the trace, preventing the model from giving outdated advice.
**8. How do you prevent hallucinations?**
*Answer:* We constrain the final output into Confirmed Evidence and Hypotheses, requiring the model to cite exact internal document IDs. If it can't find an answer, it triggers an Insufficient Evidence state.

### O. Architecture & SSE
**9. Why Server-Sent Events instead of WebSockets?**
*Answer:* The flow is unidirectional (server pushing trace updates to the client). SSE is lighter, operates over standard HTTP, and handles auto-reconnection natively.
**10. What happens if the Groq API rate limits you?**
*Answer:* Our backend catches the 429 error and preserves the session state. The frontend displays a "Paused" state with a countdown timer, allowing the user to resume without losing their investigation.

*(Extrapolate this format for remaining categories in live Q&A)*

---

## 23. 20 HARD/TRICK QUESTIONS

**1. "Why should we trust an LLM with incident investigation?"**
*Confident Answer:* You shouldn't trust it blindly. That's why we don't output a single magic answer. We output an investigation trace, cite exact document IDs, and separate Confirmed Evidence from Hypotheses. It's an assistant, not an autopilot.
**2. "What happens when your vector database retrieves the wrong document?"**
*Confident Answer:* The agent reads the document, realizes it's irrelevant to the context, and formulates a new search query. This is the exact benefit of a ReAct loop over standard RAG.
**3. "How do you determine causation instead of correlation?"**
*Confident Answer:* The model is explicitly prompted that temporal correlation (a deployment happening before an incident) is NOT causation. It lists the correlation under "Supported Hypothesis" while explicitly listing the exact technical cause as "Unresolved" unless a postmortem proves it.
**4. "What happens if Groq goes down?"**
*Confident Answer:* Currently, the Live API would fail. In production, we would implement a fallback mechanism to route requests to a secondary provider (like AWS Bedrock) via LiteLLM.

---

## 24. SECURITY QUESTIONS

**Q: Are you sending sensitive internal incident reports to a public API?**
*Answer:* In this prototype, the prompt and text are sent to Groq for inference, but our embeddings are completely local. In a production environment, we would swap the Groq API for a privately hosted model (like an on-premise Llama 3) to guarantee total data privacy.

---

## 25. SCALABILITY QUESTIONS

**Q: How would this scale to millions of documents?**
*Answer:* ChromaDB scales well locally, but for millions of documents we would migrate to a managed vector store like Pinecone or Milvus. We would also implement strict metadata filtering (e.g., only searching documents tagged 'orders-api') before doing the semantic vector search to limit the search space.

---

## 26. TESTING QUESTIONS

**Q: How did you test this?**
*Answer:* We wrote specific test scripts (e.g., `test_retrieval.py`, `verify_groq.py`) testing edge cases: multi-hop latency queries, out-of-scope rejections ("What is the capital of India?"), contradiction detection, and API rate-limit recovery.

---

## 27. LIMITATIONS

"This prototype currently operates on a static, document-based knowledge base. It does not actively query live Datadog metrics or execute bash commands on production servers. Furthermore, it relies on an external LLM provider, which introduces latency and rate limits we have to handle at the application layer."

---

## 28. FUTURE SCOPE

**Phase 1:** (Current) Document-based multi-hop investigation.
**Phase 2:** Integration with live observability platforms (Datadog/Prometheus) to retrieve real-time metrics during the ReAct loop.
**Phase 3:** Integration with ticketing (Jira/PagerDuty) to automatically draft incident postmortems based on the investigation trace.
**Phase 4:** Human-in-the-loop remediation (suggesting scripts that an SRE clicks to execute).

---

## 29. "DO NOT SAY" LIST

- **DO NOT SAY:** "The AI always finds the root cause." 
  **INSTEAD:** "The system produces an evidence-backed hypothesis and explicitly identifies what is unresolved."
- **DO NOT SAY:** "Hallucinations are impossible." 
  **INSTEAD:** "We strictly mitigate hallucinations through required citations and explicit insufficient-evidence states."
- **DO NOT SAY:** "It fixes incidents automatically." 
  **INSTEAD:** "It investigates incidents automatically to accelerate human remediation."
- **DO NOT SAY:** "We built a custom LLM." 
  **INSTEAD:** "We orchestrate an open-weight LLM using a custom ReAct agent architecture."

---

## 30. ONE-PAGE JUDGE CHEAT SHEET

**SRE OPERATIONS CENTER**
**PROBLEM:** SREs waste critical downtime manually correlating scattered incident logs and deployments.
**SOLUTION:** An autonomous ReAct agent that iteratively searches internal knowledge, evaluates conflicts, and synthesizes cited hypotheses.
**WORKFLOW:** Scope Check → ReAct Loop (Search & Observe) → Conflict Evaluator → Synthesis → SSE Stream.
**MODEL:** Qwen 3.8-27b (via Groq for speed).
**AGENTIC BEHAVIOR:** It observes intermediate search results and formulates follow-up searches autonomously.
**RETRIEVAL:** ChromaDB + Local Embeddings (SentenceTransformers).
**DIFFERENTIATOR:** We explicitly handle outdated runbook contradictions and separate Confirmed Evidence from Hypotheses.
**LIMITATIONS:** Static knowledge base; relies on external LLM provider.
**FUTURE:** Live Datadog integration and human-in-the-loop remediation.

---

## 31. PROJECT FACTS THAT MUST BE VERIFIED

*(Internal Checklist for the Team before presenting)*
1. **Model:** Confirm we are actually hitting the `qwen` model via Groq in `agent.py`.
2. **Embeddings:** Confirm we are using `SentenceTransformers` locally in `embedding.py`, not OpenAI embeddings.
3. **Replay Demo:** Confirm the exact Demo script works in the current cinematic UI without triggering the Live API.
4. **Scope Check:** Confirm that "What is the capital of India?" actually triggers the deterministic out-of-scope block.
