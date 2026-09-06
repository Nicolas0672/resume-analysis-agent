from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate

from backend.model.job_pydantic import JobDetails

model = ChatOpenAI(model="gpt-4o")

async def validate_job_details(job_details):
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a job description validator. If the job details are valid, return a JSON object. Do not change requirements or job description. Only use job details provided"),
        ("user", "Validate the following job details and return a JSON object if valid. Here are the job details: {job_details}")
    ])

    llm_structured = model.with_structured_output(JobDetails)
    response = await llm_structured.ainvoke(prompt.format_messages(job_details=job_details))
    return response