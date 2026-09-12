from backend.agent.model import CandidateAnalysis
from backend.agent.state import AgentState
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.messages import AIMessage

from datetime import date

def get_current_date():
    return date.today().isoformat()

async def analyze_candidate(state: AgentState):

    resume_data = state.get("resume_data")
    job_details = state.get("job_details")
    job_requirements = job_details.job_requirements
    current_date = get_current_date()

    fields = ["job_title", "job_responsibilities",  "job_company"]

    selected = {
        field: getattr(job_details, field, None)
        for field in fields
    }

    candidate_profile_data = state.get("candidate_profile_data", "no experience available")

    prompt = ChatPromptTemplate.from_messages(
    [
    ("system",
    """
    You are a resume analysis agent.

    Perform an evidence-based comparison between the candidate and the job requirements. Your analysis is the foundation for downstream interview planning, so identify meaningful evidence gaps rather than producing a keyword checklist.

    ### Core reasoning

    For each important job requirement:

    1. **Interpret** what the requirement is actually evaluating.
    2. **Match** the candidate's concrete evidence, including work, projects, coursework, and transferable experience.
    3. **Assess** whether the evidence is direct, partial, unclear, or absent.
    4. **Identify** the smallest meaningful evidence gap that remains.
    5. **Determine** whether the gap is distinct from other gaps.

    Look beyond keyword matches. Credit transferable experience when it demonstrates the underlying capability, even when the exact technology or domain differs.

    Do not assume a requirement is satisfied merely because a related keyword appears. Evaluate what the candidate actually did, their ownership, technical contribution, scope, impact, outcomes, and metrics when relevant.

    ### Gap behavior

    A gap must represent a meaningful deficiency in evidence relative to a stated job requirement.

    Distinguish between:

    * **missing** — no relevant evidence is present;
    * **partial** — relevant evidence exists but does not fully satisfy the requirement;
    * **unclear** — relevant experience exists, but important details are not demonstrated;
    * **transferable** — direct evidence is absent, but adjacent experience may plausibly demonstrate the underlying requirement.

    Do not treat a missing keyword as a gap by itself.

    When multiple requirements reflect the same underlying deficiency, consolidate them into one gap rather than creating overlapping gaps.

    Prefer:
    "Testing experience is demonstrated through JUnit, but integration, end-to-end, and load testing are not established."

    Do not produce separate gaps for each missing testing type.

    For subjective requirements such as passion, mission alignment, startup fit, or communication, distinguish between lack of evidence and evidence of absence. If the resume simply does not reveal the trait, describe it as unclear or not demonstrated rather than assuming the candidate lacks it.

    Do not invent or assume candidate experience, skills, metrics, responsibilities, or outcomes.

    Do not flag availability, location, scheduling, work authorization, citizenship, start date, timing, eligibility, or semester requirements.

    ### Strength behavior

    Strengths should represent meaningful, evidence-backed matches to job requirements.

    Prefer concrete evidence and explain why it satisfies or supports the requirement. Do not list every technology or resume keyword as a strength.

    ### Prioritization

    Focus the analysis on requirements that materially affect candidate fit.

    Do not create gaps for information that cannot be meaningfully investigated or improved through the candidate's existing experience.

    The purpose of the analysis is not to determine whether the candidate is perfect for the role. It is to produce a precise map of:
    * what the candidate clearly demonstrates,
    * what is partially demonstrated,
    * what is unclear,
    * and what meaningful evidence is missing.

    Be strict, concise, and candidate-specific.
    """),
    ("human",
    """
    job_requirements: {job_requirements}

    Resume Data: {resume_data}

    Job Details: {job_details}

    Candidate Profile Data: {candidate_profile_data}
    """)
    ]
    )
    model = ChatOpenAI(model="gpt-4o")
    llm_structured = model.with_structured_output(CandidateAnalysis)
    response = await llm_structured.ainvoke(prompt.format_messages(current_date=current_date,job_details=selected, resume_data=resume_data, candidate_profile_data=candidate_profile_data, job_requirements=job_requirements))

    return {
        "candidate_analysis": response,
        "messages": [AIMessage(content=response.user_message)]
    }

