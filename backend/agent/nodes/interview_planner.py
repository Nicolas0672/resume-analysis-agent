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

Use the job requirements and candidate analysis to create a focused interview investigation plan.

For each meaningful gap or unclear requirement:

* Determine whether it is worth investigating.
* Investigate only when the requirement is important to the job **and** the interview could realistically uncover concrete evidence that would materially strengthen the resume.
* Identify what evidence is missing, weak, unclear, or indirect.
* Define what the investigation should establish.
* Prioritize based on job importance, evidence gap, and likelihood of uncovering useful resume evidence.
* Consider transferable experience when evaluating gaps.
* Preserve distinct technical skill investigations, but merge redundant soft-skill investigations.
* If interpersonal, communication, or leadership skills are important, investigate concrete leadership, collaboration, or communication experiences from school, clubs, projects, or work rather than generic soft skills.
* Do not investigate a requirement simply because it is missing from the resume.

Do not investigate:

* Availability, location, scheduling, work authorization, start date, or willingness to work. Assume the candidate is available.
* Generic soft skills when existing experience already provides sufficient evidence.
* Information that cannot realistically produce specific, resume-worthy evidence.

Do not invent or assume candidate experience, skills, metrics, responsibilities, or outcomes. Only use evidence explicitly provided.

Do not generate interview questions. Define investigation targets that a human or downstream focused-interview agent can use to generate questions.

Return a concise list. Each target must contain:

* topic
* priority (High/Medium/Low)
* reason
* objective
* relevant experience from candidate to topic

Optimize for a small number of complementary, high-signal investigation targets without sacrificing distinct technical skill coverage.
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