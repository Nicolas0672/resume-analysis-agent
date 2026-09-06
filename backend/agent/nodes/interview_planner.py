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

    interview_planner_prompt = ChatPromptTemplate.from_messages([
        ("system",
    """
    You are an interview planning agent.

    Use the job requirements, candidate analysis to create a focused interview investigation plan.

    For each meaningful gap or unclear requirement:
    - Determine whether it is worth investigating.
    - Explain what evidence is missing or unclear.
    - Identify what the interview should establish.
    - Prioritize investigations based on job importance and likelihood of uncovering useful evidence.
    - Investigation targets should not contain availability of candidate for the job. Assume the candidate is available to work for the job.
    - Consider transferable experience when deciding whether a gap is worth investigating.

    Do not invent or assume candidate experience, skills, metrics, or outcomes.

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

    Candidate analysis:
    {candidate_analysis}

    """)
    ])

    model = ChatOpenAI(model="gpt-4o")
    llm_structured = model.with_structured_output(InterviewPlan)
    response = await llm_structured.ainvoke(interview_planner_prompt.format_messages(
        job_details=selected, candidate_analysis=candidate_analysis)
        )
    
    return {
        "interview_plan": response
    }