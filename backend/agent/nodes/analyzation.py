from backend.agent.model import CandidateAnalysis
from backend.agent.state import AgentState
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.messages import AIMessage

async def analyze_candidate(state: AgentState):

    resume_data = state.get("resume_data")
    job_details = state.get("job_details")
    candidate_profile_data = state.get("candidate_profile_data", "no experience available")

    prompt = ChatPromptTemplate.from_messages(
        [("system", """
    You are a resume analysis agent. Your task is to analyze the candidate's resume and provide insights based on the job details provided.
Return:

score: overall fit based on ALL job requirements. Be strict and evidence-based. A candidate should not be considered a strong match simply because they have strong experience in a few core technologies. Missing multiple hard requirements must significantly reduce the rating.

strong match: Candidate clearly satisfies nearly all critical hard requirements, with only minor gaps or preferred-skill gaps.
good match: Candidate satisfies most critical hard requirements, but has some meaningful gaps.
weak match: Candidate is missing multiple critical hard requirements, lacks evidence for several required qualifications, or does not provide enough resume evidence to confidently establish fit.

strengths: key confirmed matches between the resume, candidate profile data and job.
gaps: ALL meaningful missing or partially matched requirements. Do not limit gaps to the top few. Check every explicit hard requirement, including education/degree, technical skills, tools, databases, cloud, domain knowledge, and required experience. Group duplicate/related requirements where appropriate.
relevant_experience: experience from candidate_profile_data ONLY that matches the job requirements. If none is provided or relevant, return null.

Do not infer or assume skills, education, experience, or qualifications that are not explicitly supported by the provided data. Distinguish between confirmed matches, partial matches, and missing requirements. Do not require exact technology matches when related experience is transferable. Evaluate the underlying skill as well as the specific technology requested. 

Job benefits and non-requirement information should not be considered gaps.
        """),
        ("human", """

        Resume Data: {resume_data}
        Job Details: {job_details}
        Candidate Profile Data: {candidate_profile_data}
        """)]
    )

    model = ChatOpenAI(model="gpt-4o")
    llm_structured = model.with_structured_output(CandidateAnalysis)
    response = await llm_structured.ainvoke(prompt.format_messages(job_details=job_details, resume_data=resume_data, candidate_profile_data=candidate_profile_data))

    return {
        "score": response.score,
        "relevant_experience": response.relevant_experience,
        "gaps": response.gaps,
        "strengths": response.strengths,
        "messages": [AIMessage(content=response.user_message)]
    }

