from backend.agent.model import InterviewPlan
from backend.agent.state import AgentState
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI


async def interview_agent(state: AgentState):
    gaps = state['gaps']
    strengths = state['strengths']
    resume_data = state['resume_data']
    relevant_experience = state['relevant_experience']
    job_details = state['job_details']

    interview_planner_prompt = ChatPromptTemplate.from_messages([
        ("system",
    """
    You are an interview planning agent.

    Use the job requirements, candidate resume, strengths, gaps, and relevant experience to create a focused interview investigation plan.

    For each meaningful gap or unclear requirement:
    - Determine whether it is worth investigating.
    - Explain what evidence is missing or unclear.
    - Identify what the interview should establish.
    - Prioritize investigations based on job importance and likelihood of uncovering useful evidence.
    - Consider transferable experience when deciding whether a gap is worth investigating.

    Do not invent or assume candidate experience, skills, metrics, or outcomes.
    A gap means the resume does not provide sufficient evidence; it does not necessarily mean the candidate lacks the skill.

    Do not generate detailed interview questions yet. Define investigation targets that a human can select and pass to a focused interview agent.

    Return a concise list of investigation targets with:
    - topic
    - priority
    - reason
    - objective
    - relevant experience from candidate to topic
    """),
        ("human",
    """
    Job:
    {job_details}

    Candidate strengths:
    {strengths}

    Candidate gaps:
    {gaps}

    Relevant experience:
    {relevant_experience}

    Resume:
    {resume_data}
    """)
    ])

    model = ChatOpenAI(model="gpt-4o")
    llm_structured = model.with_structured_output(InterviewPlan)
    response = await llm_structured.ainvoke(interview_planner_prompt.format_messages(
        job_details=job_details, strengths=strengths, gaps=gaps, relevant_experience=relevant_experience, resume_data=resume_data)
        )
    
    return {
        "interview_plan": response
    }