"""
Prompt Caching & Multi-Turn Latency Benchmark Script
=====================================================
This script benchmarks the real-world impact of Prompt Caching (KV Cache)
on OpenAI's GPT-4o API across a multi-turn conversation (Turns 1 to 5).

Key Architectural Comparison:
1. OLD Architecture: Dynamic variables ({topic}, {active_experience_metadata}, {evidence_with_details})
   sit inside the SYSTEM message. Dynamic data changes before token 1,024 on every turn,
   invalidating the KV cache prefix and resulting in 0% cached tokens.

2. NEW Architecture: The SYSTEM message is 100% static and invariant (>= 1,024 tokens).
   All dynamic conversation context is appended to the HUMAN message suffix.
   This preserves the GPU KV cache prefix across all turns and all sessions.

Each run generates a unique session UUID to simulate a real, fresh user conversation
and prevent false cache hits from prior script executions.

Usage:
    python benchmark/benchmark_cache.py
"""

import os
import sys
import time
import uuid
import asyncio
from typing import Literal, Optional
from dotenv import load_dotenv

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Load environment variables from backend/.env
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

if not os.environ.get("OPENAI_API_KEY"):
    print("ERROR: OPENAI_API_KEY is not set in backend/.env!")
    sys.exit(1)

from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate


# ---------------------------------------------------------------------------
# 1. Structured Output Schema (Identical for Both Tests)
# ---------------------------------------------------------------------------
class BenchmarkOutput(BaseModel):
    is_sufficient: bool = Field(
        default=False,
        description=(
            "Set to True ONLY when the candidate has provided concrete, verifiable evidence "
            "(actions, technical methods, problem context, and outcomes) demonstrating the target requirement "
            "within this active experience. MUST be False if key evidence is still missing."
        )
    )
    suggested_experience_tab: Optional[Literal["work_experience", "leadership", "other"]] = Field(
        default=None,
        description=(
            "If the candidate indicates that the probed skill/requirement was gained in a DIFFERENT category "
            "(e.g. internship/job -> 'work_experience', club -> 'leadership', other -> 'other'), specify it here."
        )
    )
    user_message: str = Field(
        description="Conversational response to the candidate asking the single next high-leverage question or guiding tab switch."
    )


# ---------------------------------------------------------------------------
# 2. OLD Architecture (Dynamic Variables in System Message)
# ---------------------------------------------------------------------------
OLD_SYSTEM_TEMPLATE = """
You are an expert technical interviewer and resume strategist. Your single mission is to guide the candidate to uncover high-impact evidence for strong, compelling resume bullet points tailored to the target job requirement.

### INVESTIGATION TARGET (NORTH STAR):
- TOPIC: {topic}
- OBJECTIVE: {objective}
- JOB REQUIREMENT: {job_requirement}

Current active experience metadata: {active_experience_metadata}
Established evidence bank: {evidence_with_details}

### PRIMARY DIRECTIVE — OBJECTIVE-ANCHORED PROBING (NON-NEGOTIABLE):
Every single question you ask MUST actively probe and gather evidence for THIS SPECIFIC OBJECTIVE: "{objective}".
- NEVER fall back to generic software interrogation like "What technical challenge did you work on? What was your role, and what technologies or tools did you use?".
- ALWAYS evaluate the 4 pillars (Problem, Action, Trade-offs, Impact) THROUGH THE LENS OF "{objective}".
- When the candidate establishes or returns to an experience (e.g. an internship or project), frame your next question around how they demonstrated "{objective}" in that setting.

### THE BRIDGE-BACK TECHNIQUE (PREVENTING UNRELATED RABBIT HOLES):
- When the candidate answers with technical specifics, implementation mechanics, or architecture:
  1. In ONE brief, natural phrase, acknowledge their technical work.
  2. IMMEDIATELY bridge it back to the objective: "{objective}".
- Example: If the objective is "Cross-Functional Communication / Collaboration" and the candidate says "I built a vector retrieval pipeline using LangChain and FastAPI":
  - BAD: "Could you share a specific technical challenge or project you worked on there? What technologies did you use?" (Completely loses the objective!)
  - BAD: "What embedding model and chunk size did you configure in LangChain?" (Rabbit hole!)
  - GOOD: "You engineered that retrieval pipeline—how did you coordinate with product managers or frontend engineers to align on API contracts and communicate latency trade-offs?"
- Example: If the objective is "System Scalability" and the candidate talks about team meetings:
  - GOOD: "Glad you aligned with the team—what architectural decisions or load-testing strategies did you implement to ensure the system scaled under high user concurrency?"

### The 4 Pillars of Resume Evidence (Applied to {objective}):
Every strong resume bullet point needs a balance of:
1. PROBLEM & CONTEXT: What was the specific obstacle, scale, or context relating to {objective}?
2. CONCRETE ACTIONS & OWNERSHIP: What specific methods, decisions, or processes did the candidate personally lead or implement to achieve {objective}?
3. TRADE-OFFS & CRITICAL THINKING: Why this approach over alternatives? What friction, conflict, or technical bottleneck did they navigate regarding {objective}?
4. MEASURABLE IMPACT & OUTCOMES: What was the quantifiable result or benefit (e.g. latency cut, alignment speed, metrics, performance, adoption) achieved for {objective}?

### How to Guide the Candidate (Gap-Driven Interviewing):
- Look at the `conversation_history`, `active_experience_metadata`, and `relevant_experience_from_resume`.
- Identify what is ALREADY ESTABLISHED vs WHAT IS STILL MISSING to craft stellar resume bullets for {objective}.
- Actively guide the candidate toward the missing pillar (especially Measurable Impact, Scale, or Critical Trade-offs).
- If the candidate answers with high-level theory, prompt for concrete specifics.
- If the candidate answers with low-level implementation, lift them up to the impact, trade-offs, and outcomes.

### Conversational Guardrails:
1. BREADTH OVER TRIVIA (NO TUNNEL VISION):
   - NEVER drill down into routine boilerplate code, standard libraries, or trivial setup details.
   - Once a choice is explained, do NOT keep asking "how did you implement that". Instead, PIVOT to Trade-offs or Measurable Impact relating to {objective}.
2. NATURAL & ENGAGING DIALOGUE (NO ROBOTIC ECHOES):
   - NEVER start questions with formulaic, repetitive echoes like "You've mentioned...", "You described...", or "You've shared...".
   - Speak naturally like a senior engineering leader: direct, curious, and collaborative.
3. IDENTITY GAPS:
   - If core identity details are still unknown, ask for those details early while anchoring to {objective}.
4. ONE QUESTION AT A TIME:
   - Ask EXACTLY ONE thoughtful, high-leverage question at a time.

### TURN DECISION MATRIX (4 MUTUALLY EXCLUSIVE STATES):
For every candidate turn, identify which ONE of the following 4 states applies and adhere strictly to its rules:

STATE 1: TARGET EVIDENCE SUFFICIENT (Evidence Cleared)
- WHEN: The candidate has provided concrete, verifiable details for all pillars for "{objective}" in active experience.
- ACTION: Warmly summarize evidence. Invite to click 'Wrap Up & Save Evidence'. DO NOT ask questions.

STATE 2: SKILL GAINED ELSEWHERE / TAB REDIRECTION (Experience Mismatch)
- WHEN: Candidate mentions or indicates that the probed skill was gained in a DIFFERENT category than the active tab.
- CRITICAL TAB GUARDRAIL: If candidate is ALREADY on the matching tab, this state does NOT apply! DO NOT suggest switching tabs.
- ACTION: Acknowledge where it was gained; instruct them to switch to that tab on the right. DO NOT invite wrap-up.

STATE 3: NO EXPERIENCE WITH THIS SKILL / GAP (Dead End)
- WHEN: Candidate explicitly confirms they have NO experience with this tool/skill anywhere.
- ACTION: Respectfully acknowledge. Reassure them it is okay. Suggest clicking 'Skip Topic' below. DO NOT fake evidence completion.

STATE 4: IN PROGRESS / PROBING
- WHEN: Active experience is being discussed, but evidence pillars are missing for "{objective}".
- ACTION: Apply Bridge-Back and ask EXACTLY ONE thoughtful question probing the missing pillar.

{scoping_instructions}
"""

OLD_HUMAN_TEMPLATE = """conversation history: {conversation_history}, 
topic: {topic}, 
reasoning for investigation: {reason}, 
any relevant experience: {relevant_experience}
objective: {objective}  
job requirement for context: {job_requirement}
relevant experience from resume: {relevant_experience_from_resume}
evidence_with_details: {evidence_with_details}
"""

old_prompt_template = ChatPromptTemplate.from_messages([
    ("system", OLD_SYSTEM_TEMPLATE),
    ("human", OLD_HUMAN_TEMPLATE),
])


# ---------------------------------------------------------------------------
# 3. NEW Architecture (100% Static Prefix >= 1,024 Tokens, Dynamic Suffix)
# ---------------------------------------------------------------------------
NEW_STATIC_SYSTEM_PROMPT = """You are an expert technical interviewer and resume strategist. Your single mission is to guide the candidate to uncover high-impact evidence for strong, compelling resume bullet points tailored to the target job requirement.

### PRIMARY DIRECTIVE — OBJECTIVE-ANCHORED PROBING (NON-NEGOTIABLE):
Every single question you ask MUST actively probe and gather evidence for the active objective provided in the context below.
- NEVER fall back to generic software interrogation like "What technical challenge did you work on? What was your role, and what technologies or tools did you use?".
- ALWAYS evaluate the 4 pillars (Problem, Action, Trade-offs, Impact) strictly through the lens of the target objective.
- When the candidate establishes or returns to an experience, frame your next question around how they demonstrated the target objective in that setting.
- Apply the Bridge-Back technique: when the candidate gives technical specifics or mechanics, briefly acknowledge their technical work in one natural phrase, then immediately steer back to the target objective. Avoid getting trapped in routine library configurations or syntax details.

### THE 4 PILLARS OF RESUME EVIDENCE:
Every strong resume bullet point needs a balance of:
1. PROBLEM & CONTEXT: What was the specific obstacle, scale, or context relating to the target objective?
2. CONCRETE ACTIONS & OWNERSHIP: What specific methods, decisions, or processes did the candidate personally lead or implement to achieve the target objective?
3. TRADE-OFFS & CRITICAL THINKING: Why this approach over alternatives? What friction, conflict, or technical bottleneck did they navigate regarding the target objective?
4. MEASURABLE IMPACT & OUTCOMES: What was the quantifiable result or benefit (e.g. latency cut, alignment speed, metrics, performance, user adoption) achieved for the target objective?

### HOW TO GUIDE THE CANDIDATE (GAP-DRIVEN INTERVIEWING):
- Review the conversation history, established evidence, and active experience metadata provided below.
- Identify what is ALREADY ESTABLISHED versus WHAT IS STILL MISSING across the 4 pillars for the target objective.
- Actively guide the candidate toward the missing pillar (especially Measurable Impact, Scale, or Critical Trade-offs).
- If the candidate answers with high-level theory, prompt for concrete specifics.
- If the candidate answers with low-level implementation, lift them up to impact, trade-offs, and measurable outcomes.

### CONVERSATIONAL RULES & GUARDRAILS:
1. BREADTH OVER TRIVIA: Never drill down into routine boilerplate code, standard libraries, or trivial setup details. Once an architectural or technical choice is explained, do NOT ask for trivial syntax; pivot to trade-offs or measurable outcomes.
2. NATURAL & ENGAGING DIALOGUE: Speak naturally like a senior engineering leader: direct, curious, and collaborative. Never start questions with formulaic, repetitive echoes like "You've mentioned...", "You described...", or "You've shared...".
3. IDENTITY GAPS: If core identity details (such as Company Name, Job Title, or Project Name) are still unknown, ask for those details early while anchoring to the target objective.
4. ONE QUESTION AT A TIME: Ask EXACTLY ONE thoughtful, high-leverage question at a time. Never barrage the candidate with compound questions.

### TURN DECISION MATRIX (4 MUTUALLY EXCLUSIVE STATES):
For every candidate turn, identify which ONE of the following 4 states applies and adhere strictly to its rules:

STATE 1: TARGET EVIDENCE SUFFICIENT (Evidence Cleared)
- WHEN: The candidate has provided concrete, verifiable details (problem context, specific actions/ownership, and measurable outcomes or critical trade-offs) demonstrating the target objective within the active experience.
- ACTION: Warmly and concisely summarize the strong evidence gathered for the target objective. Inform the candidate they have great material and can click "Wrap Up & Save Evidence" whenever ready. DO NOT ask any more questions. DO NOT end with a question mark.

STATE 2: SKILL GAINED ELSEWHERE / TAB REDIRECTION (Experience Mismatch)
- WHEN: The candidate mentions or indicates that the probed skill or requirement was gained or applied in a DIFFERENT category than the current active tab (e.g. active tab is Project, but candidate states they developed this skill through an internship or job).
- CRITICAL TAB GUARDRAIL: If the candidate is ALREADY on the matching tab (e.g. discussing an internship or job while currently on the Work Experience tab), this state does NOT apply! DO NOT suggest switching tabs. Keep suggested_experience_tab as None. Proceed to State 4 (Probing) or State 1 (Sufficient).
- ACTION: Warmly acknowledge where they gained it; explain that to capture that experience accurately for this requirement, they should switch to that tab on the right. Instruct them clearly to switch to that tab. DO NOT summarize to conclude. DO NOT invite them to click "Wrap Up & Save Evidence". DO NOT confirm as proceed. Leave experience_metadata empty so active form is not corrupted.

STATE 3: NO EXPERIENCE WITH THIS SKILL / GAP (Dead End)
- WHEN: The candidate explicitly confirms they have NO experience with this tool, skill, or requirement anywhere across their background (e.g. "No, I haven't worked with REST APIs", "I don't have experience with cloud storage").
- ACTION: Respectfully and reassuringly acknowledge what they stated. DO NOT interrogate why they haven't used it or push them to learn it. Explain that it's completely okay, and inform them they can click "Skip Topic" below to proceed, or share another technical strength. DO NOT invite wrap-up or claim target evidence was cleared.

STATE 4: IN PROGRESS / PROBING
- WHEN: The candidate is describing work within the active experience, but key pillars (problem context, specific methods/actions, trade-offs, or measurable impact) are still missing for the target objective.
- ACTION: Apply the Bridge-Back technique and ask EXACTLY ONE thoughtful, high-leverage question actively probing for the missing pillar anchored to the target objective.
"""

NEW_HUMAN_TEMPLATE = """### ACTIVE INVESTIGATION SCOPE (NORTH STAR):
- Target Topic: {topic}
- Objective: {objective}
- Job Requirement: {job_requirement}
- Investigation Reason: {reason}
- Relevant Resume Experience: {relevant_experience}
- Relevant Experience References from Resume: {relevant_experience_from_resume}

### CURRENT EXPERIENCE IDENTITY & FORM METADATA:
{active_experience_metadata}

### CURRENT ACTIVE SCOPE:
{scoping_instructions}

### ESTABLISHED EVIDENCE BANK:
{evidence_with_details}

### CONVERSATION HISTORY:
{conversation_history}

Please review the conversation history and context above, determine which state in the Turn Decision Matrix applies, and provide your structured response.
"""

new_prompt_template = ChatPromptTemplate.from_messages([
    ("system", NEW_STATIC_SYSTEM_PROMPT),
    ("human", NEW_HUMAN_TEMPLATE),
])


# ---------------------------------------------------------------------------
# 4. Realistic Simulated 5-Turn Conversation Progression
# ---------------------------------------------------------------------------
def get_turn_data(turn: int, session_id: str):
    """
    Simulates a realistic 5-turn interview conversation where context accumulates.
    `session_id` ensures that dynamic variables are salted per run, guaranteeing
    that the OLD architecture cannot cheat via prior-run GPU cache hits.
    """
    base_info = {
        "topic": "REST APIs & Cloud Storage",
        "objective": "Evaluate REST API development with FastAPI and AWS S3 integration",
        "job_requirement": "Hands-on experience developing RESTful APIs and integrating cloud object storage",
        "reason": "Resume mentions Python and Docker but does not specify REST endpoint design or S3 integration scale.",
        "relevant_experience": ["AI Study Assistant project"],
        "relevant_experience_from_resume": "Project 1: AI Study Assistant (Next.js, FastAPI, PostgreSQL, AWS S3)",
        "scoping_instructions": 'Current Active Experience: Project "AI Study Assistant". Keep focus strictly on this project.',
    }

    # Turns simulate expanding conversation history & updated metadata
    if turn == 1:
        return {
            **base_info,
            "active_experience_metadata": f'{{"experience_type": "project", "project_name": "AI Study Assistant", "session": "{session_id}"}}',
            "evidence_with_details": "No prior evidence recorded yet.",
            "conversation_history": (
                f"[Candidate Session: {session_id}]\n"
                "AI: In your AI Study Assistant project, did you have any involvement with developing REST APIs "
                "or integrating cloud storage solutions? If so, what was the problem and your actions?\n"
                "User: Yes, in AI Study Assistant I created endpoints for document parsing using FastAPI and connected AWS S3 for PDF uploads."
            ),
        }
    elif turn == 2:
        return {
            **base_info,
            "active_experience_metadata": f'{{"experience_type": "project", "project_name": "AI Study Assistant", "technologies": ["FastAPI", "AWS S3", "Python"], "session": "{session_id}"}}',
            "evidence_with_details": "FastAPI endpoints designed; connected AWS S3 for document uploads.",
            "conversation_history": (
                f"[Candidate Session: {session_id}]\n"
                "AI: In your AI Study Assistant project, did you have any involvement with developing REST APIs or integrating cloud storage solutions?\n"
                "User: Yes, in AI Study Assistant I created endpoints for document parsing using FastAPI and connected AWS S3 for PDF uploads.\n"
                "AI: You engineered that document parsing pipeline—how did you structure the S3 upload endpoints to handle large files, and what trade-offs did you evaluate regarding synchronous versus presigned URL uploads?\n"
                "User: I implemented S3 presigned URLs so users could upload large PDFs directly to the bucket, which eliminated server upload bottlenecks and reduced API latency by 40%."
            ),
        }
    elif turn == 3:
        return {
            **base_info,
            "active_experience_metadata": f'{{"experience_type": "project", "project_name": "AI Study Assistant", "technologies": ["FastAPI", "AWS S3", "Python", "Pydantic"], "scale": "50MB files", "session": "{session_id}"}}',
            "evidence_with_details": "FastAPI endpoints designed; S3 presigned URLs cut API latency by 40% and prevented server bottlenecks on 50MB files.",
            "conversation_history": (
                f"[Candidate Session: {session_id}]\n"
                "AI: In your AI Study Assistant project, did you have any involvement with developing REST APIs or integrating cloud storage solutions?\n"
                "User: Yes, in AI Study Assistant I created endpoints for document parsing using FastAPI and connected AWS S3 for PDF uploads.\n"
                "AI: You engineered that document parsing pipeline—how did you structure the S3 upload endpoints to handle large files, and what trade-offs did you evaluate regarding synchronous versus presigned URL uploads?\n"
                "User: I implemented S3 presigned URLs so users could upload large PDFs directly to the bucket, which eliminated server upload bottlenecks and reduced API latency by 40%.\n"
                "AI: That direct upload architecture solved the memory bottleneck—what challenges or concurrency issues emerged when multiple users attempted uploads simultaneously, and how did your FastAPI service coordinate validation?\n"
                "User: When 25+ users uploaded simultaneously, background workers experienced race conditions during database record creation. I introduced Redis-based distributed locks and Pydantic validation schemas to guarantee idempotency and maintain sub-100ms request handling."
            ),
        }
    elif turn == 4:
        return {
            **base_info,
            "active_experience_metadata": f'{{"experience_type": "project", "project_name": "AI Study Assistant", "technologies": ["FastAPI", "AWS S3", "Python", "Pydantic", "Redis"], "scale": "25+ concurrent users", "session": "{session_id}"}}',
            "evidence_with_details": "FastAPI with S3 presigned URLs; Redis distributed locks and Pydantic validation resolved concurrency race conditions under 25+ concurrent uploads.",
            "conversation_history": (
                f"[Candidate Session: {session_id}]\n"
                "AI: In your AI Study Assistant project, did you have any involvement with developing REST APIs or integrating cloud storage solutions?\n"
                "User: Yes, in AI Study Assistant I created endpoints for document parsing using FastAPI and connected AWS S3 for PDF uploads.\n"
                "AI: You engineered that document parsing pipeline—how did you structure the S3 upload endpoints to handle large files, and what trade-offs did you evaluate regarding synchronous versus presigned URL uploads?\n"
                "User: I implemented S3 presigned URLs so users could upload large PDFs directly to the bucket, which eliminated server upload bottlenecks and reduced API latency by 40%.\n"
                "AI: That direct upload architecture solved the memory bottleneck—what challenges or concurrency issues emerged when multiple users attempted uploads simultaneously, and how did your FastAPI service coordinate validation?\n"
                "User: When 25+ users uploaded simultaneously, background workers experienced race conditions during database record creation. I introduced Redis-based distributed locks and Pydantic validation schemas to guarantee idempotency and maintain sub-100ms request handling.\n"
                "AI: Implementing distributed locks protected data integrity—what testing or resilience mechanisms did you configure to handle S3 network timeouts or failed upload confirmations?\n"
                "User: I implemented exponential backoff retries with Tenacity, set up dead-letter queues with AWS SQS for failed document ingestion jobs, and achieved 93% integration test coverage using pytest and LocalStack."
            ),
        }
    else:  # turn >= 5
        return {
            **base_info,
            "active_experience_metadata": f'{{"experience_type": "project", "project_name": "AI Study Assistant", "technologies": ["FastAPI", "AWS S3", "Python", "Pydantic", "Redis", "AWS SQS"], "scale": "15,000 documents processed", "session": "{session_id}"}}',
            "evidence_with_details": "FastAPI + S3 presigned URLs; Redis locks for concurrency; Tenacity exponential backoff and SQS dead-letter queues; 93% LocalStack test coverage.",
            "conversation_history": (
                f"[Candidate Session: {session_id}]\n"
                "AI: In your AI Study Assistant project, did you have any involvement with developing REST APIs or integrating cloud storage solutions?\n"
                "User: Yes, in AI Study Assistant I created endpoints for document parsing using FastAPI and connected AWS S3 for PDF uploads.\n"
                "AI: You engineered that document parsing pipeline—how did you structure the S3 upload endpoints to handle large files, and what trade-offs did you evaluate regarding synchronous versus presigned URL uploads?\n"
                "User: I implemented S3 presigned URLs so users could upload large PDFs directly to the bucket, which eliminated server upload bottlenecks and reduced API latency by 40%.\n"
                "AI: That direct upload architecture solved the memory bottleneck—what challenges or concurrency issues emerged when multiple users attempted uploads simultaneously, and how did your FastAPI service coordinate validation?\n"
                "User: When 25+ users uploaded simultaneously, background workers experienced race conditions during database record creation. I introduced Redis-based distributed locks and Pydantic validation schemas to guarantee idempotency and maintain sub-100ms request handling.\n"
                "AI: Implementing distributed locks protected data integrity—what testing or resilience mechanisms did you configure to handle S3 network timeouts or failed upload confirmations?\n"
                "User: I implemented exponential backoff retries with Tenacity, set up dead-letter queues with AWS SQS for failed document ingestion jobs, and achieved 93% integration test coverage using pytest and LocalStack.\n"
                "AI: Excellent engineering depth across the entire lifecycle—what was the overall scale and quantifiable outcome of this system in production?\n"
                "User: The system successfully ingested and parsed over 15,000 PDF documents with a 99.8% processing success rate, reduced cloud server compute costs by 35%, and supported 600 active students during university exam weeks."
            ),
        }


# ---------------------------------------------------------------------------
# 5. Multi-Turn Benchmark Runner
# ---------------------------------------------------------------------------
async def run_multiturn_trial(
    trial_name: str,
    prompt_template: ChatPromptTemplate,
    session_id: str,
    total_turns: int = 5,
):
    print(f"\n{'='*80}")
    print(f">> RUNNING: {trial_name}")
    print(f">> Candidate Session UUID: {session_id}")
    print(f"{'='*80}")

    # Pass prompt_cache_key to ensure OpenAI cluster routes requests to the warm GPU cache shard
    model = ChatOpenAI(
        model="gpt-4o",
        temperature=0,
        model_kwargs={"prompt_cache_key": "resume_interview_agent"}
    ).with_structured_output(BenchmarkOutput, include_raw=True)

    turn_results = []

    for turn in range(1, total_turns + 1):
        data = get_turn_data(turn, session_id)
        formatted_msgs = prompt_template.format_messages(**data)

        print(f"  [Turn {turn}/{total_turns}] Sending request...", end="", flush=True)
        t0 = time.perf_counter()
        response = await model.ainvoke(formatted_msgs)
        t1 = time.perf_counter()
        latency = t1 - t0

        raw = response["raw"]
        usage = raw.response_metadata.get("token_usage", {})
        prompt_tokens = usage.get("prompt_tokens", 0)
        cached_tokens = usage.get("prompt_tokens_details", {}).get("cached_tokens", 0)
        output_tokens = usage.get("completion_tokens", 0)
        hit_pct = (cached_tokens / prompt_tokens * 100) if prompt_tokens > 0 else 0.0

        # OpenAI Pricing for gpt-4o:
        # Standard input: $2.50 / 1M tokens
        # Cached input:   $1.25 / 1M tokens (50% discount)
        # Cost saved on this turn = cached_tokens * ($2.50 - $1.25) / 1,000,000
        cost_saved = (cached_tokens * 1.25) / 1_000_000

        print(f" Done in {latency:.3f}s | Prompt={prompt_tokens:,} | Cached={cached_tokens:,} ({hit_pct:.1f}%)")

        turn_results.append({
            "turn": turn,
            "latency": latency,
            "prompt_tokens": prompt_tokens,
            "cached_tokens": cached_tokens,
            "output_tokens": output_tokens,
            "hit_pct": hit_pct,
            "cost_saved": cost_saved,
        })

        # Brief pause between turns for realistic pacing & cluster synchronization
        if turn < total_turns:
            await asyncio.sleep(2.0)

    return turn_results


# ---------------------------------------------------------------------------
# 6. Main Comparison & Comprehensive Scorecard
# ---------------------------------------------------------------------------
async def main():
    print("\n" + "="*85)
    print("      MULTI-TURN PROMPT CACHING BENCHMARK: OLD VS NEW ARCHITECTURE")
    print("="*85)
    print("Simulating a realistic 5-turn interview conversation where context grows past 5,000 tokens.")

    # Generate a unique session ID for this benchmark run
    session_id = f"sim_{uuid.uuid4().hex[:8]}"
    num_turns = 5

    # Run OLD Architecture (Dynamic variables in System prompt)
    old_results = await run_multiturn_trial(
        trial_name="OLD Architecture (Dynamic Variables in System Prompt)",
        prompt_template=old_prompt_template,
        session_id=session_id,
        total_turns=num_turns,
    )

    # Pause between trials to ensure clean separation
    print("\n[...] Cooling down 3.0s before testing NEW architecture...", flush=True)
    await asyncio.sleep(3.0)

    # Run NEW Architecture (100% Static System Prompt Prefix >= 1,024 Tokens)
    new_results = await run_multiturn_trial(
        trial_name="NEW Architecture (100% Static System Prefix >= 1024 Tokens)",
        prompt_template=new_prompt_template,
        session_id=session_id,
        total_turns=num_turns,
    )

    # -----------------------------------------------------------------------
    # Comprehensive Scorecard
    # -----------------------------------------------------------------------
    print("\n" + "="*105)
    print("                                      MULTI-TURN BENCHMARK SCORECARD")
    print("="*105)
    print(f"{'Turn':<6} | {'Arch':<5} | {'Prompt Tokens':<15} | {'Cached Tokens':<15} | {'Hit %':<8} | {'Latency':<10} | {'Cumul. Savings'}")
    print("-" * 105)

    cumul_old_saved = 0.0
    cumul_new_saved = 0.0

    for i in range(num_turns):
        r_old = old_results[i]
        r_new = new_results[i]

        cumul_old_saved += r_old["cost_saved"]
        cumul_new_saved += r_new["cost_saved"]

        print(f"T{r_old['turn']:<5} | OLD   | {r_old['prompt_tokens']:>12,} tok | {r_old['cached_tokens']:>12,} tok | {r_old['hit_pct']:>6.1f}% | {r_old['latency']:>8.3f}s | ${cumul_old_saved:>12.5f}")
        print(f"T{r_new['turn']:<5} | NEW   | {r_new['prompt_tokens']:>12,} tok | {r_new['cached_tokens']:>12,} tok | {r_new['hit_pct']:>6.1f}% | {r_new['latency']:>8.3f}s | ${cumul_new_saved:>12.5f}")
        print("-" * 105)

    # Summary Totals
    total_old_prompt = sum(r["prompt_tokens"] for r in old_results)
    total_new_prompt = sum(r["prompt_tokens"] for r in new_results)
    total_old_cached = sum(r["cached_tokens"] for r in old_results)
    total_new_cached = sum(r["cached_tokens"] for r in new_results)

    avg_old_hit = (total_old_cached / total_old_prompt * 100) if total_old_prompt > 0 else 0
    avg_new_hit = (total_new_cached / total_new_prompt * 100) if total_new_prompt > 0 else 0

    print("\n" + "="*85)
    print("                              EXECUTIVE SUMMARY")
    print("="*85)
    print(f"• Total Tokens Processed:      OLD = {total_old_prompt:,} | NEW = {total_new_prompt:,}")
    print(f"• Total Cached Tokens Reused:  OLD = {total_old_cached:,} | NEW = {total_new_cached:,}")
    print(f"• Session Cache Hit Rate:      OLD = {avg_old_hit:.1f}%    | NEW = {avg_new_hit:.1f}%")
    print(f"• Total Cost Saved / Session:  OLD = ${cumul_old_saved:.5f} | NEW = ${cumul_new_saved:.5f}")

    if total_new_cached > total_old_cached:
        tokens_diff = total_new_cached - total_old_cached
        print(f"\n[SUCCESS] The NEW architecture salvaged {tokens_diff:,} cached tokens across the 5 turns!")
        print(f"[METRIC] Real-World Session Cache Hit Rate achieved: {avg_new_hit:.1f}%")

    print("="*85 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
