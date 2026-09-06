from backend.agent.model import FeedbackOnTailoredBullets, TailoredBullets
from backend.agent.state import AgentState
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI


async def tailor_resume_bullet_points(state: AgentState):
    resume_data = state["resume_data"]
    interview_details_with_evidence = state["interview_details_with_evidence"]
    feedback_on_tailored_bullets = state.get(
        "feedback_on_tailored_bullets",
        "No feedback provided"
    )
    prompt = ChatPromptTemplate.from_messages([
        ("system",          
"""
You are a resume tailoring professional. Your task is to analyze the candidate's resume, review the interview details with evidence provided and use feedback on tailored bullet points to improve the quality of the bullet points. Based on this information, 
you are allowed to generate new bullet points that are more tailored to the job description and highlight the candidate's relevant experience, skills, and achievements.
If the candidate's resume already contains bullet points that are well-tailored to the job description, you may choose to keep them as they are. However, if you identify areas where the bullet points can be improved or made more relevant, you should generate new bullet points that better align with the job requirements
using the evidence provided in the interview details. Your goal is to help the candidate present their experience and qualifications in the most compelling way possible, while ensuring that the bullet points accurately reflect their skills and achievements.
Do not invent or assume candidate experience, skills, metrics, or outcomes. Only use the evidence provided in the interview details to support your bullet points.

"""), 
        ("human", "Here is the candidate's resume data: {resume_data} and here are the interview details with evidence: {interview_details_with_evidence}. Feedback on tailored bullet points: {feedback_on_tailored_bullets}.")
    ])

    model = ChatOpenAI(model="gpt-4o")
    llm_structured = model.with_structured_output(TailoredBullets)
    response = await llm_structured.ainvoke(prompt.format_messages(resume_data=resume_data, interview_details_with_evidence=interview_details_with_evidence, feedback_on_tailored_bullets=feedback_on_tailored_bullets))

    return {
        "tailored_bullets": response
    }

async def critique_tailored_bullet_points(state: AgentState):
    tailored_bullets = state["tailored_bullets"]
    interview_details_with_evidence = state["interview_details_with_evidence"]

    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
    """ You are a resume factuality critic. Your primary job is to detect hallucinations in tailored resume bullets. For every `new_bullet`, verify that EVERY factual claim is supported by the candidate's available evidence. 
    ### Rules - The candidate evidence and old bullet points are the source of truth. 
    # - `supporting_evidence` is a useful reference but must itself be validated against the available candidate evidence. 
    # - The job description/job requirements are NOT evidence of the candidate's experience. 
    # - Do not accept claims simply because they are plausible, common for the role, or relevant to the job. Be especially strict about: 
    # 1. **Metrics** — Every percentage, number, dollar amount, performance improvement, scale, team size, etc. must be explicitly supported. Never accept invented or estimated metrics. 
    # 2. **Technologies** — Only approve technologies, tools, frameworks, or languages supported by the candidate evidence. 
    # 3. **Ownership** — Do not turn "contributed to" or "worked on" into "led", "owned", "architected", or similar stronger claims without evidence. 
    # 4. **Scope** — Do not expand the size, responsibility, or scale of the candidate's work beyond the evidence. 
    # 5. **Impact** — Business, customer, technical, or performance outcomes must be supported by evidence. 
    # 6. **Experience** — Do not introduce projects, responsibilities, achievements, or skills that are not supported. Reasonable paraphrasing is acceptable as long as it does not materially change the factual meaning. 
    # Your role is fact-checking, not editing. 
    """), 
        ("human", "Here are the tailored bullets: {tailored_bullets} and here are the interview details with evidence: {interview_details_with_evidence}.")
    ])
    model = ChatOpenAI(model="gpt-4o")
    llm_structured = model.with_structured_output(FeedbackOnTailoredBullets)
    response = await llm_structured.ainvoke(prompt.format_messages(tailored_bullets=tailored_bullets, interview_details_with_evidence=interview_details_with_evidence))

    return {
        "feedback_on_tailored_bullets": response
    }

