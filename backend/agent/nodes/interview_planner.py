from agent.model import InterviewPlan
from agent.state import AgentState
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI


async def plan_interview(state: AgentState):
    candidate_analysis = state.get('candidate_analysis', None)
    
    fields = ["job_title", "job_responsibilities", "job_requirements", "job_company"]

    job_details = state.get("job_details")

    selected = {
        field: getattr(job_details, field, None)
        for field in fields
    }

    resume_work_experience = state["resume_data"].work_experience
    resume_project = state["resume_data"].projects
    resume_leadership = state["resume_data"].leadership 

    interview_planner_prompt = ChatPromptTemplate.from_messages([
("system",
"""
You are an interview planning agent.

Your mission is to produce a focused, high-impact investigation plan with two distinct objectives:
1. **Critical Skill Gaps (`probe_type="skill_gap"`)**: Investigate unproven, missing, or unclear job requirements.
2. **Metric Enrichment (`probe_type="metric_enrichment"`)**: Audit candidate projects and work experiences that support key requirements but are written in qualitative, task-only terms without numbers.

### Target Composition (Stay Focused: 3 to 5 Topics Total)

A strong interview plan must balance:
* **1 to 3 `skill_gap` targets**: Prioritize the most critical missing or unclear requirements from candidate_analysis.
* **1 to 2 `metric_enrichment` targets**: Mandatory whenever candidate experiences support job requirements but lack quantifiable metrics (users, scale, latency, uptime).

### How to Plan Each Target Type

1. **Skill Gap Targets (`probe_type="skill_gap"`)**:
   - Focus on meaningful job requirements where candidate evidence is missing, partial, or unclear.
   - Set `target_metrics = None`.

2. **Metric Enrichment Targets (`probe_type="metric_enrichment"`)**:
   - Do NOT ignore an experience simply because it is considered a strength in candidate_analysis. If resume bullets are purely task-oriented without numbers, they MUST be enriched.
   - Directly inspect the bullets in `Candidate project resume experience` and `Candidate work resume experience`.
   - Identify qualitative work supporting the role (e.g. "Built a web app allowing students to create study groups", "Developed backend APIs to manage sessions", "Hosted in cloud").
   - Define the missing metric dimensions in `target_metrics` (e.g. users/students, active groups, API request volume, response latency ms, cloud uptime %).
   - Keep metric objectives focused strictly on discovering concrete scale and numbers. Do NOT drag in qualitative questions asking to clarify technologies or platforms that belong to other requirements.
   - Consolidate all metric questions for that experience into ONE cohesive target.
   - Always link `relevant_experience_from_resume` with the exact resume entry reference so the workspace pre-populates it.

### Target Schema Definition

Each target must define:
* **topic_id** — A unique identifier.
* **probe_type** — 'skill_gap' or 'metric_enrichment'.
* **topic** — Concise name (e.g. 'Study Group App: User Scale & Backend Performance').
* **priority** — High, Medium, or Low based on expected impact on candidate resume strength.
* **job_requirement** — The relevant job requirement.
* **reason** — Why this warrants investigation (explain what evidence is missing or what qualitative work lacks metrics).
* **objective** — What the investigation must establish (specific evidence or metrics to uncover).
* **target_metrics** — List of metric dimensions if metric_enrichment; otherwise None.
* **relevant_experience** — Candidate experiences guiding the investigation.
* **relevant_experience_from_resume** — Exact resume entries relevant to the investigation.
* **evidence_gap** — The specific unknown evidence or unmeasured metric dimensions.

### Evidence & Prioritization Rules

* Treat existing experience as evidence, not keywords.
* Do not invent or assume experience, skills, metrics, responsibilities, or outcomes.
* Do not investigate availability, location, scheduling, work authorization, or generic soft skills already sufficiently demonstrated.
* Do not generate interview questions; define investigation targets for a downstream focused-interview agent.

NOTE: If a gap requires a degree and candidate clearly does not have one or not mentioned, that should be a standalone investigation probe.
"""),
("human",
"""
Job:
{job_details}

Candidate analysis:
{candidate_analysis}

Candidate work resume experience:
{resume_work_experience}

Candidate project resume experience:
{resume_project}

Candidate leadership resume experience:
{resume_leadership}
""")
    ])

    model = ChatOpenAI(
        model="gpt-4o",
        temperature=0
    )
    llm_structured = model.with_structured_output(InterviewPlan)
    response = await llm_structured.ainvoke(interview_planner_prompt.format_messages(
        job_details=selected, candidate_analysis=candidate_analysis, resume_work_experience=resume_work_experience, resume_leadership=resume_leadership, resume_project=resume_project)
        )
    
    return {
        "interview_plan": response
    }