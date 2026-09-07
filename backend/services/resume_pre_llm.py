from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate

from backend.model.job_pydantic import JobDetails, ResumeStructure

model = ChatOpenAI(model="gpt-4o")

async def validate_job_details(job_details):
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a job description validator. If the job details are valid, return a JSON object. Do not change requirements or job description. Only use job details provided"),
        ("user", "Validate the following job details and return a JSON object if valid. Here are the job details: {job_details}")
    ])

    llm_structured = model.with_structured_output(JobDetails)
    response = await llm_structured.ainvoke(prompt.format_messages(job_details=job_details))
    return response

async def structure_resume_date(resume_data):
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a resume data structuring agent. If the resume data is valid, return a JSON object. Do not change the resume data. Only use resume data provided"),
        ("user", "Validate the following resume data and return a JSON object if valid. Here are the resume data: {resume_data}")
    ])

    llm_structured = model.with_structured_output(ResumeStructure)
    response = await llm_structured.ainvoke(prompt.format_messages(resume_data=resume_data))
    return response