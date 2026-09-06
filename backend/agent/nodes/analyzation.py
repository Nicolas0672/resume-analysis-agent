from backend.agent.model import CandidateAnalysis
from backend.agent.state import AgentState
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.messages import AIMessage

async def analyze_candidate(state: AgentState):

    resume_data = state.get("resume_data")
    job_details = state.get("job_details")
    job_requirements = job_details.job_requirements

    fields = ["job_title", "job_responsibilities",  "job_company"]

    selected = {
        field: getattr(job_details, field, None)
        for field in fields
    }

    candidate_profile_data = state.get("candidate_profile_data", "no experience available")

    prompt = ChatPromptTemplate.from_messages(
        [("system", """
You are a resume analysis agent. Perform a thorough, evidence-based comparison of the candidate against the job requirements.

Rules:

Use only information explicitly supported by the candidate data. Do not infer or assume qualifications.
Evaluate requirements thoroughly, considering the candidate's experience, projects, coursework, and transferable skills. 
Look beyond keyword matches. Determine whether the candidate's experience actually demonstrates the underlying skill, including through projects, coursework, work experience, or transferable experience.
Relevant experience should be credited when the underlying skill is demonstrated; exact technology matches are not always necessary.
Do not treat missing information as a gap unless it relates to a stated job requirement.
Consider evidence across the entire resume. Do not assume that a requirement is satisfied simply because related technologies or skills appear elsewhere.
For relevant projects or work experience, consider whether the candidate's role, technical contribution, scope, impact, outcomes, or metrics are sufficiently demonstrated.
Do not flag company/mission interest, benefits, work authorization, citizenship, availability, timing, eligibility, or semester requirements as gaps; assume those criteria are satisfied.
Do not include redundant or overlapping gaps.
Prefer specific, evidence-based gaps over broad statements such as "limited experience."

The goal is to produce a deep assessment of the candidate's fit, including strengths and meaningful evidence gaps, rather than simply determining whether the candidate is generally qualified.        
"""),
        ("human", """
        job_requirements: {job_requirements}
        Resume Data: {resume_data}
        Job Details: {job_details}
        Candidate Profile Data: {candidate_profile_data}
        """)]
    )

    model = ChatOpenAI(model="gpt-4o")
    llm_structured = model.with_structured_output(CandidateAnalysis)
    response = await llm_structured.ainvoke(prompt.format_messages(job_details=selected, resume_data=resume_data, candidate_profile_data=candidate_profile_data, job_requirements=job_requirements))

    return {
        "candidate_analysis": response,
        "messages": [AIMessage(content=response.user_message)]
    }

