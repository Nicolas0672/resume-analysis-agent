from fastapi import HTTPException
from services.document_parser import parse_resume
from services.job_fetcher import fetch_job_details
from services.resume_pre_llm import structure_resume_data, validate_job_details

MAX_JOB_DESCRIPTION_LENGTH = 15000


async def prepare_resume_and_job_inputs(
    file_bytes: bytes,
    job_url: str | None = None,
    job_description: str | None = None,
):
    """Parses raw resume bytes (paragraphs & tables) and extracts/validates job description details.
    
    Prepares typed structured inputs (ResumeStructure & JobDetails) prior to launching
    the LangGraph agent state machine.
    """
    parsed_resume = parse_resume(file_bytes)

    if job_description:
        if len(job_description) > MAX_JOB_DESCRIPTION_LENGTH:
            return {
                "success": False,
                "requires_job_description": True,
                "error": "The pasted job description is too large. Please paste a shorter job description.",
                "structured_resume": None,
                "job_details": None,
            }
        job_details = job_description

    elif job_url:
        try:
            job_details = await fetch_job_details(job_url=job_url)
        except ValueError as e:
            return {
                "success": False,
                "requires_job_description": True,
                "error": str(e),
                "structured_resume": None,
                "job_details": None,
            }

    else:
        return {
            "success": False,
            "requires_job_description": True,
            "error": "Please provide a job URL or paste the job description.",
            "structured_resume": None,
            "job_details": None,
        }

    validated_job_details = await validate_job_details(job_details=job_details)
    structured_resume = await structure_resume_data(resume_data=parsed_resume)

    if not validated_job_details.is_valid:
        raise HTTPException(
            status_code=400,
            detail="Invalid job details",
        )

    return {
        "success": True,
        "requires_job_description": False,
        "structured_resume": structured_resume,
        "job_details": validated_job_details,
    }



