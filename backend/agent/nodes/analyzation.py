from backend.agent.model import CandidateAnalysis
from backend.agent.state import AgentState
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.messages import AIMessage

async def analyze_candidate(state: AgentState):

    resume_data = state.get("resume_data")
    job_details = state.get("job_details")
    job_requirements = job_details.job_requirements
    job_preferred_requirement = job_details.job_preferred_requirement if job_details.job_preferred_requirement is not None else "No preferred requirements available"

    fields = ["job_title", "job_responsibilities",  "job_company"]

    selected = {
        field: getattr(job_details, field, None)
        for field in fields
    }

    candidate_profile_data = state.get("candidate_profile_data", "no experience available")

    prompt = ChatPromptTemplate.from_messages(
        [("system", """
You are a resume analysis agent. Analyze the candidate's resume and candidate profile data. Prioritize comparing candidate against the job_requirements and job_preferred_requirement. Assume the applicant is a US citizen and authorized to work in the US and available to work for the duration or completion of the job
and meets any requirement for having at least one semester remaining.

Rules:

* Use only information explicitly supported by the candidate data. Do not infer or assume qualifications.
- Determine education requirements from the job description. For undergraduate/intern roles, do not treat an incomplete degree as a gap when the role is intended for students. For new-grad or degree-required roles, only flag education when the candidate does not meet the stated requirement.
* Do not treat missing information as a gap unless the job explicitly requires it.
* Do not flag company/mission interest or enthusiasm unless explicitly stated as a job requirement and not shown through candidate experience.
* Related or transferable experience can satisfy a requirement when the underlying skill is demonstrated; exact technology matches are not always necessary.
* Exclude benefits and other non-requirement information from gaps.
        """),
        ("human", """
        job_requirements: {job_requirements}
        job_preferred_requirement: {job_preferred_requirement}
        Resume Data: {resume_data}
        Job Details: {job_details}
        Candidate Profile Data: {candidate_profile_data}
        """)]
    )

    model = ChatOpenAI(model="gpt-4o")
    llm_structured = model.with_structured_output(CandidateAnalysis)
    response = await llm_structured.ainvoke(prompt.format_messages(job_details=selected, resume_data=resume_data, candidate_profile_data=candidate_profile_data, job_requirements=job_requirements, job_preferred_requirement=job_preferred_requirement))

    return {
        "score": response.score,
        "relevant_experience": response.relevant_experience,
        "gaps": response.gaps,
        "strengths": response.strengths,
        "messages": [AIMessage(content=response.user_message)]
    }

