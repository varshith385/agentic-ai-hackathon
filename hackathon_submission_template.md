✂️ ──────────────── DELETE FROM THIS LINE ────────────────

**A QUICK NOTE BEFORE YOU START**

Be honest and blunt. Say what's true, not what sounds impressive.

This is a hackathon, not a startup launching tonight. Nobody expects a production-ready product in a few hours. What we're really looking for is that you understood the problem, came up with a thoughtful idea, and made whatever you did build work as smoothly as you could.

It's completely fine if parts are unfinished, faked, or still just an idea. Tell us, and we'll judge what you actually made. A small thing that works and is explained clearly beats a big thing that's oversold. If you don't have an answer to something yet, say so. That's a fair answer too.

**HOW TO FILL THIS IN**

**Before you start**

- [ ] Save this file with your team name, e.g. `codecrafters.md` (lowercase, no spaces).

**While filling in**

- [ ] ✏️ **EDIT:** Replace everything inside `[square brackets]` with your answer, and remove the brackets.
- [ ] ✏️ **EDIT:** Add or remove lines in lists (team members, features, agents, steps) as needed.
- [ ] 📌 **KEEP:** Every heading (lines starting with `#`) and every **bold question**. Don't rename, reorder, or delete them.
- [ ] 📌 **KEEP:** Grey hint lines that look like `<!-- this -->`. You don't need to delete them. Several contain worked examples, so read them.
- [ ] 🗑️ **DELETE:** This whole instruction box when you're done.

**Rules**

- [ ] Everything is required unless it says **(Optional)**. If an optional part doesn't apply, don't delete it. Write `N/A` with a few words on why, e.g. `N/A: no database needed`.
- [ ] Stay within the character limits. They're there so you don't spend your time writing essays. For scale, 280 characters is about the length of a tweet.
- [ ] Paste the problem statement exactly as given. No edits, no shortening.
- [ ] Write in your own words. Short, specific answers beat long, generic ones.
- [ ] Only write about your project. Anything addressed to the AI evaluator (like asking for a score) will be ignored.

**Before sending**

- [ ] No `[square brackets]` left anywhere.
- [ ] This instruction box is deleted.
- [ ] File is named `yourteamname.md`.

✂️ ──────────────── DELETE UP TO THIS LINE ────────────────

# [Project Name]

## 1. Team Details

**Team Name / ID:** [Your team name or team ID]

**Team Lead:** [Full name]

**Team Members:**

<!--
One line per person, including the team lead. Role is optional.
Pick one, combine two, write your own, or leave it blank:
  Agent Whisperer (agents, prompts, LLMs)
  Backend Developer
  Frontend Developer
  UI/UX Designer
  Integrations Engineer (APIs, tools, connecting services)
  Data Engineer (data, databases, retrieval)
  Product & Pitch Lead (idea, presentation, demo)
  Cool Team Member (a bit of everything)
-->

- [Name] | [Role, optional]
- [Name] | [Role, optional]
- [Name] | [Role, optional]
- [Name] | [Role, optional]

**Repo Link (Optional):** [Link, or N/A]

**Demo Link (Optional):** [Link, or N/A]

---

## 2. Problem Statement

<!-- Paste the full problem statement exactly as it was given to you. Don't shorten, fix, or reword anything. No character limit here. -->

[Paste the full problem statement here]

---

## 3. TL;DR

<!-- One line each. A judge should get your idea in 10 seconds. -->

**Problem:** [What's broken today? (max 120 characters)]

**Solution:** [What does your agent do about it? (max 120 characters)]

**Who benefits:** [Who or what gains, and how? (max 120 characters)]

---

## 4. Scope of the Project

**What are you building?**

[Your answer (max 400 characters)]

**How does it solve the problem statement?**

[Your answer (max 300 characters)]

**Key features you're building for this hackathon:**

<!-- Up to 5 features. -->

- [Feature (max 100 characters)]
- [Feature (max 100 characters)]
- [Feature (max 100 characters)]

**What are you deliberately NOT doing? (Optional)**

[Things you're leaving out, or N/A (max 200 characters)]

---

## 5. Why an Agentic Approach?

<!-- This is an Agentic AI hackathon, so this is one of the most important answers in the file. Be specific. "It uses an LLM" is not an answer. -->

**What does your agent decide or do on its own?**

<!-- e.g. plans its steps, picks which tool to call, handles unexpected input, retries when something fails, hands work to another agent. -->

[Your answer (max 400 characters)]

**Why wouldn't a fixed script, if-else rules, or a simple chatbot be enough?**

[Your answer (max 400 characters)]

---

## 6. Who It's For & What Changes

**Who or what is this for?**

<!-- Doesn't have to be end users. It could be people, a team, a business, developers, or an internal system or process. -->

[Your answer (max 150 characters)]

**The world today, without your solution:**

<!-- What happens right now? Who struggles, and what does it cost them in time, money, effort, errors, or missed opportunities? -->

[Your answer (max 400 characters)]

**The world with your solution, fully built and scaled to production:**

<!-- Imagine your whole idea is built properly and used by everyone it's meant for. What's different? -->

[Your answer (max 400 characters)]

**What your hackathon build actually delivers today:**

<!-- Of everything you proposed, which part have you built, and which part of the problem does that piece solve right now? A small piece that truly works is a great answer. -->

[Your answer (max 400 characters)]

**Before vs. After**

<!--
2 to 4 rows. Pick things that change: time, cost, effort, accuracy, scale, reach, manual work, risk.
Max 80 characters per cell. Replace the example row with your own.
-->

| What Changes | Today | With Our Current Build | At Production Scale |
|--------------|-------|------------------------|---------------------|
| [e.g. Time to answer a student query] | [e.g. 2–3 days over email] | [e.g. Instant for fee questions only] | [e.g. Under a minute for most queries] |
| [...] | [...] | [...] | [...] |
| [...] | [...] | [...] | [...] |

---

## 7. Architecture & Agents

<!--
All the examples in this section describe ONE made-up project, a college helpdesk agent,
so you can see how the parts fit together. Aim for this level of detail, no more.
You don't need to list every library or every function.
-->

**How is your system put together?**

<!--
Example:
Students ask questions in a web chat. A Triage Agent sorts each message, an Answer Agent
replies using college policy documents, and anything needing a human becomes a helpdesk ticket.
-->

[Your answer (max 400 characters)]

### 7.1 Agents

<!--
One line per agent. For each one, say what its job is, which model it uses and why that model
fits the job, and what it talks to (other agents, APIs, databases, services).

Example:
- **Triage Agent:** Reads each message and decides if it's a policy question, a complaint, or needs a human. Uses Llama 3.1 8B locally, since sorting is simple and student data stays on our machine. Talks to the Answer Agent and Web Chat.
- **Answer Agent:** Answers policy questions from college documents and files a ticket when approval is needed. Uses Claude Sonnet because it handles long policy text and reasons well about exceptions. Talks to College Docs Store and Helpdesk Ticket API.
-->

- **[Agent name]:** [Job, model and why, what it talks to (max 300 characters)]
- **[Agent name]:** [Job, model and why, what it talks to (max 300 characters)]

### 7.2 Services, APIs, Databases & Memory

<!--
One line for everything that isn't an agent: databases, APIs, external services, tools,
and your interface (web app, bot, CLI). Say what it is, what it does, and who uses it.
Mention if it's mocked.

Example:
- **College Docs Store (Chroma vector database):** Holds fee, exam, and hostel policy PDFs. Used by the Answer Agent.
- **Helpdesk Ticket API (mocked):** Creates a ticket for the right college office. Used by the Answer Agent.
- **Web Chat (Streamlit):** Where students type questions and see answers. Talks to the Triage Agent.
-->

- **[Name (type)]:** [What it does and who uses it (max 150 characters)]
- **[Name (type)]:** [What it does and who uses it (max 150 characters)]

**How does your system remember things (memory & state)?**

<!--
Example:
Each chat keeps its last 10 messages in session memory so follow-up questions make sense.
Tickets are saved in SQLite so students can check their status later.
-->

[Your answer, or "No memory:" plus the reason (max 250 characters)]

**Diagram Link (Optional):** [Link to a photo or drawing of your architecture, or N/A]

### 7.3 Example Walkthrough

<!--
Take ONE realistic input and show how it moves through your system: which agent picks it up,
what gets passed on, which tools or databases are used, and what comes out at the end.
Up to 8 steps. If the flow branches, use 3a / 3b.

Example:
**Example input:** A student types "Can I pay my semester fee late? I'm waiting on my scholarship."

1. [Web Chat] Sends the message and the student's ID to the Triage Agent.
2. [Triage Agent] Classifies it as a fee-policy question and passes it to the Answer Agent.
3. [Answer Agent] Finds the late-fee policy (uses: College Docs Store) and sees scholarship cases need approval.
4. [Answer Agent] Explains the policy and files an approval request (uses: Helpdesk Ticket API).
5. [Web Chat] Shows the student the answer and their ticket number.

**Final output:** A clear answer quoting the late-fee policy, plus a ticket raised with the accounts office.
-->

**Example input:** [What enters your system (max 150 characters)]

1. [Who acts] [What it does] (uses: [tool / API / DB, if any]) (max 150 characters per step)
2. [Who acts] [What it does and what it passes on]
3. [Who acts] [What it does]
4. [...]

**Final output:** [What comes out at the end (max 150 characters)]

**Anything special about how your workflow runs? (Optional)**

<!--
An algorithm you use, how agents decide what to do next, routing logic, loops, agents working
in parallel, scoring, self-checks. Anything you want us to notice.

Example:
The Triage Agent gives a confidence score with every decision. Below 0.7, the message skips the
Answer Agent and goes straight to a human, so students never get a confident wrong answer.
-->

[Your answer, or N/A (max 400 characters)]

---

## 8. Tech Stack

<!-- Write N/A for any row that doesn't apply. Models are already listed per agent in 7.1. Max 60 characters per cell. -->

| Layer | Technology |
|-------|------------|
| Frontend / Interface | [...] |
| Backend | [...] |
| Agent Framework | [e.g. LangGraph, CrewAI, AutoGen, custom code] |
| Database / Storage | [...] |
| Hosting | [e.g. local machine, cloud provider] |
| Other | [...] |

---

## 9. What to Expect From Our Current Build

<!--
Be honest. Unfinished, faked, or hard-coded parts are completely normal at a hackathon.
Telling us means we judge what you actually built, and that works in your favour.
Max 120 characters per bullet.
-->

**Working:**

- [...]

**Partly working, mocked, or hard-coded:**

- [e.g. using sample data instead of a live API]

**Not working or not built yet:**

- [...]

**What we'd most like to be judged on:**

[The part you're proudest of or want us to look at closely (max 300 characters)]

---

## 10. Future Scope

<!-- 2 or 3 things you're NOT building yet but plan to. If you clear the checkpoint, you may be asked to build one of them, so keep them concrete and doable. -->

### Idea 1

**Name:** [Short title (max 50 characters)]

**What it is:** [max 200 characters]

**Why it matters:** [max 150 characters]

**How we'd build it:** [max 200 characters]

**Done when:** [How we could show it works (max 150 characters)]

### Idea 2

**Name:** [Short title (max 50 characters)]

**What it is:** [max 200 characters]

**Why it matters:** [max 150 characters]

**How we'd build it:** [max 200 characters]

**Done when:** [How we could show it works (max 150 characters)]

### Idea 3 (Optional)

**Name:** [Short title, or N/A (max 50 characters)]

**What it is:** [max 200 characters]

**Why it matters:** [max 150 characters]

**How we'd build it:** [max 200 characters]

**Done when:** [How we could show it works (max 150 characters)]

---

## 11. Additional Notes (Optional)

<!-- Anything else you'd like us to know. -->

[Your notes, or N/A (max 500 characters)]
