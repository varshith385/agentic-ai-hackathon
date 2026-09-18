# SRE Operations Center - Incident Investigation Agent

## 1. Team Details

**Team Name / ID:** Antigravity Team

**Team Lead:** Varshith

**Team Members:**

- Varshith | Full Stack AI Engineer

**Repo Link (Optional):** https://github.com/varshith385/agentic-ai-hackathon

**Demo Link (Optional):** N/A

---

## 2. Problem Statement

The Investigation Nobody Could Answer
Context
Your company has operated a large distributed platform for several years. Over time, thousands of internal documents have accumulated:
incident reports 
deployment notes 
architecture documents 
troubleshooting guides 
customer complaints 
engineering discussions 
post-incident reviews 
One morning an engineer reports: "The Order API became extremely slow after yesterday's deployment. Has this happened before?" The answer isn't necessarily contained in one document. There may be:
several incidents with similar symptoms 
different terminology describing the same problem 
old recommendations that are no longer valid 
contradictory documents 
newer documents that supersede older ones 
incomplete evidence 

The Challenge
Build an Incident Investigation Agent that investigates operational incidents across a collection of internal documents. A question should be answerable only after the agent connects evidence from multiple sources such as incident reports, deployments, architecture notes, troubleshooting guides, customer complaints, and postmortems.
Core Requirements
Accept a natural-language investigation question.
Search across multiple document types using semantic and metadata-aware retrieval.
Use information discovered during investigation to perform additional searches.
Distinguish document dates, software versions, and outdated guidance.
Detect contradictions and avoid treating similar incidents as identical.
Return an evidence-backed answer with document identifiers and a clear statement when evidence is insufficient.
Inputs Students Can Test
Test Input A — Deployment-related incident
Test Input B — Contradictory guidance
Test Input C — Insufficient evidence

---

## 3. TL;DR

**Problem:** Engineers waste hours manually correlating alerts across thousands of outdated, contradictory incident/deployment documents.

**Solution:** An autonomous agent performing multi-hop semantic searches to link incidents to deployments and filter outdated runbooks.

**Who benefits:** SREs and on-call engineers, who get instant, evidence-backed root cause analysis and verified troubleshooting steps.

---

## 4. Scope of the Project

**What are you building?**

We built the "SRE Operations Center," a premium React/FastAPI web application powered by an autonomous Investigation Agent. It uses Gemini 1.5 Flash and ChromaDB to perform multi-hop reasoning over incident reports, postmortems, and deployment notes.

**How does it solve the problem statement?**

It accepts natural-language queries, autonomously searches a vector database, uses initial findings (like a version number) to trigger subsequent searches (like deployment notes), and detects/filters outdated runbook versions.

**Key features you're building for this hackathon:**

- Autonomous multi-hop semantic search (ReAct agent)
- Deterministic contradiction detection (filtering v1 vs v3 documents)
- Resumable API sessions with state preservation for 429 rate limits
- Real-time investigation trace streaming (SSE) to the frontend
- Verified Demo Mode for guaranteed presentation reliability

**What are you deliberately NOT doing? (Optional)**

N/A: We are not integrating live production telemetry (Datadog/PagerDuty) or using a persistent database for session state (using in-memory).

---

## 5. Why an Agentic Approach?

**What does your agent decide or do on its own?**

The agent dynamically decides its search queries. For example, if it finds an incident mentioning "v2.8.1", it autonomously formulates a new search for "orders-api v2.8.1 historical latency". It evaluates the results and decides if it has enough evidence to synthesize an answer or if it must halt due to insufficient evidence.

**Why wouldn't a fixed script, if-else rules, or a simple chatbot be enough?**

A fixed script cannot know what version number or dependency will be discovered in the first search. A simple chatbot cannot execute recursive database queries based on partial evidence. The agent must dynamically adapt its investigation path based on the specific evidence it uncovers at each step.

---

## 6. Who It's For & What Changes

**Who or what is this for?**

Site Reliability Engineers (SREs), DevOps, and on-call responders.

**The world today, without your solution:**

When an alert fires at 2 AM, the on-call engineer must manually grep through Jira, Confluence, and PagerDuty to find related deployments or past postmortems. They often follow outdated runbooks (e.g., restarting a service when they shouldn't), leading to prolonged downtime and costly mistakes.

**The world with your solution, fully built and scaled to production:**

The moment an alert triggers, the agent instantly performs a forensic investigation across all internal systems. The engineer wakes up to a complete root-cause hypothesis, exact deployment correlations, and the verified, most up-to-date remediation steps, reducing MTTR to minutes.

**What your hackathon build actually delivers today:**

A fully functional, multi-hop reasoning engine that successfully connects a latency spike (INC-1042) to a specific deployment (DEP-882) and a historical postmortem (PM-211), while also correctly ignoring an outdated v1 runbook in favor of a v3 runbook.

**Before vs. After**

| What Changes | Today | With Our Current Build | At Production Scale |
|--------------|-------|------------------------|---------------------|
| Incident Correlation | Hours of manual searching | Instant retrieval across test data | Instant across all company knowledge |
| Runbook Accuracy | High risk of using outdated steps | Automated v1 vs v3 filtering | Deep GitHub/Wiki version control sync |
| API Rate Limits | Hard failures and lost context | Sessions pause and resume gracefully | Enterprise quotas eliminate limits |

---

## 7. Architecture & Agents

**How is your system put together?**

Users query a React frontend. A FastAPI backend streams the investigation via SSE. The Investigation Agent (Gemini) decides what to search. Searches hit ChromaDB. A deterministic Evaluator intercepts the results to remove contradictory/outdated documents before returning them to the agent.

### 7.1 Agents

- **Investigation Agent:** Reads the query, formulates ChromaDB semantic searches, and synthesizes final root-cause analysis. Uses Gemini 1.5 Flash via `google-genai` SDK for fast tool-calling and reasoning. Talks to the Retrieval System.

### 7.2 Services, APIs, Databases & Memory

- **Retrieval System (ChromaDB):** Vector database holding the incident corpus. Embedded using Gemini `text-embedding-004`.
- **Evaluator Interceptor (Python):** Deterministic logic that intercepts ChromaDB results and strips outdated documents (v1 vs v3) before the LLM sees them.
- **FastAPI / SSE Stream:** Manages the API endpoints and streams real-time `tool_call` and `warning` events to the UI.
- **Session Memory (In-Memory Dict):** Holds agent thread state, SSE traces, and search caches to support pausing/resuming on 429 rate limits.

**How does your system remember things (memory & state)?**

Session state (trace logs, agent thread `threading.Event`, and search query cache) is stored in a backend in-memory dictionary. This allows the system to freeze the agent during API rate limits and resume without losing context.

**Diagram Link (Optional):** N/A

### 7.3 Example Walkthrough

**Example input:** "Why did the Order API become slow on September 16? Check whether the deployment was related."

1. [Investigation Agent] Formulates search query (uses: search_documents tool).
2. [Retrieval System] Embeds query and semantic-searches ChromaDB for "Order API slow September 16".
3. [Evaluator Interceptor] Validates documents, passes INC-1042 and DEP-882 to Agent.
4. [Investigation Agent] Identifies version v2.8.1 and formulates a second search for historical latency on that version.
5. [Retrieval System] Searches ChromaDB and retrieves PM-211 (historical postmortem).
6. [Investigation Agent] Connects the evidence and formulates a final answer (uses: synthesize_answer).
7. [FastAPI Stream] Emits the final result and citations via SSE to the React frontend.

**Final output:** A detailed root-cause hypothesis linking the latency to the v2.8.1 deployment and database connection saturation, citing INC-1042, DEP-882, and PM-211.

**Anything special about how your workflow runs? (Optional)**

We implemented a hybrid AI/Deterministic approach. Instead of asking the LLM to figure out which runbook is newer, our `evaluator.py` intercepts the vector search results, parses the metadata for `vX` semantic versions, and deterministically drops the older document, replacing it with a system warning for the LLM.

---

## 8. Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend / Interface | React, Vite, Tailwind CSS, SSEClient |
| Backend | Python, FastAPI, Uvicorn, asyncio, threading |
| Agent Framework | Custom ReAct loop using `google-genai` SDK |
| Database / Storage | ChromaDB (Vector Store) |
| Hosting | Localhost |
| Other | Gemini 1.5 Flash, Gemini `text-embedding-004` |

---

## 9. What to Expect From Our Current Build

**Working:**

- Semantic retrieval and metadata parsing via ChromaDB.
- Deterministic contradiction detection (filtering older versions).
- Multi-hop agentic reasoning (using initial findings to trigger new searches).
- Resumable session state (pausing the agent thread on 429 errors).
- Real-time Investigation Trace UI with rich citation cards.

**Partly working, mocked, or hard-coded:**

- The document dataset is limited to the 7 core test-case JSON documents provided in the problem statement.
- The "Verified Demo Mode" in the UI hardcodes the SSE trace to guarantee presentation reliability without burning Gemini API quota.

**Not working or not built yet:**

- Persistent database for session storage (currently in-memory).
- Integration with live telemetry systems (Datadog/PagerDuty).

**What we'd most like to be judged on:**

Our robust architecture. We successfully decoupled the SSE network layer from the Agent Thread, allowing us to freeze the LLM in memory during 429 rate limits, cache identical tool calls, and resume the investigation flawlessly without wasting quota.

---

## 10. Future Scope

### Idea 1

**Name:** Live Telemetry Integration

**What it is:** Allowing the agent to execute real-time Datadog/Prometheus queries alongside document searches.

**Why it matters:** Documents contain history, but telemetry contains the current truth. Combining both provides ultimate RCA.

**How we'd build it:** Add a `query_metrics` tool to the agent that accepts PromQL, executes against an API, and returns time-series anomalies.

**Done when:** The agent can state: "INC-1042 matches PM-211, and I confirmed via Datadog that CPU is currently spiking identically."

### Idea 2

**Name:** Automated Runbook Execution

**What it is:** Moving the agent from "read-only" investigation to "read-write" remediation.

**Why it matters:** Identifying the problem is only half the battle; fixing it safely is the ultimate goal.

**How we'd build it:** Introduce strict "Human-in-the-loop" tools (e.g., `propose_restart_service`) where the agent prepares the command but blocks until a human clicks "Approve" in the UI.

**Done when:** The agent successfully rolls back a bad deployment via an API after receiving explicit human approval through the frontend.

### Idea 3 (Optional)

**Name:** N/A

**What it is:** N/A

**Why it matters:** N/A

**How we'd build it:** N/A

**Done when:** N/A

---

## 11. Additional Notes (Optional)

We encountered severe Gemini Free Tier API rate limits (5 RPM) during development, which heavily restricted our ability to perform multi-hop tool-calling. To solve this, we engineered a custom `tenacity` wait strategy that pauses the Python thread using `threading.Event` when a 429 occurs, allowing the user to resume the session later without losing the LLM's `chat.history`. We also built a frontend "Replay Demo" mode to ensure judges can see the intended, verified UX flawlessly.
