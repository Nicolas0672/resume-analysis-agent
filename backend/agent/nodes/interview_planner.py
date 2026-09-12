from backend.agent.model import InterviewPlan
from backend.agent.state import AgentState
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI


async def interview_agent(state: AgentState):
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

Create a focused investigation plan from the job requirements and the candidate's known experience.

### Core behavior

For each important requirement, reason in this order:

1. **Interpret** — Determine what the requirement is actually evaluating beyond its wording.
2. **Match** — Identify concrete candidate experience that already provides relevant, adjacent, or transferable evidence.
3. **Gap** — Determine the specific important evidence that remains unknown, weak, indirect, or insufficiently demonstrated.
4. **Value** — Decide whether interviewing could realistically uncover truthful evidence that would materially strengthen the resume.
5. **Target** — Create an investigation target only when that expected value is high enough.

A missing keyword is not automatically a gap. Prefer investigating an evidence gap over a keyword gap.

Use the candidate's actual experiences to shape the investigation. Do not simply restate the job requirement as the topic, reason, or objective.

### Investigation targets

Each target must define:

* **topic** — A concise, candidate-specific investigation area.
* **priority** — High, Medium, or Low based on job importance, evidence gap, and expected value.
* **reason** — Why this candidate warrants investigation, including what relevant evidence already exists and what remains uncertain.
* **objective** — The specific evidence the investigation should establish.
* **relevant_experience** — Distinct candidate experiences that should guide the investigation.
* **relevant_experience_from_resume** — Exact resume entries relevant to the investigation.
* **evidence_gap** — The specific unknown or insufficient evidence the interview should resolve.

### Evidence reasoning

* Treat existing candidate experience as evidence, not keywords.
* Consider transferable experience when direct experience is absent.
* For subjective requirements such as passion, interest, motivation, or mission alignment, investigate concrete experiences, choices, projects, involvement, or motivations from which the trait could reasonably be inferred rather than seeking self-reported claims.
* For interpersonal, communication, or leadership requirements, investigate concrete situations and actions rather than generic claims.
* Keep evidence scoped to its original experience. Never combine unrelated experiences into a single investigation.
* Do not invent or assume experience, skills, metrics, responsibilities, or outcomes.

### Prioritization

Investigate only when:
* the requirement is meaningful to the role,
* a meaningful evidence gap exists, and
* interviewing could plausibly uncover resume-worthy evidence.

Do not investigate:
* availability, location, scheduling, work authorization, start date, or willingness to work;
* generic soft skills already sufficiently demonstrated;
* requirements for which no useful evidence could realistically be uncovered.

Preserve distinct technical investigations when they are materially different. Merge redundant soft-skill investigations.

Do not generate interview questions. Define investigation targets for a downstream focused-interview agent.

Optimize for a small number of complementary, high-signal investigations. It is acceptable to leave a requirement unresolved when there is no worthwhile investigation path.
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

    model = ChatOpenAI(model="gpt-4o")
    llm_structured = model.with_structured_output(InterviewPlan)
    response = await llm_structured.ainvoke(interview_planner_prompt.format_messages(
        job_details=selected, candidate_analysis=candidate_analysis, resume_work_experience=resume_work_experience, resume_leadership=resume_leadership, resume_project=resume_project)
        )
    
    return {
        "interview_plan": response
    }