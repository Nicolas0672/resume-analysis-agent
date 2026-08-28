
from fastapi import HTTPException

from backend.services.resume_llm_validator import validate_job_details
from backend.services.job_fetcher import fetch_job_details
from backend.services.document_parser import open_docx, parse_docx, parse_resume


async def process_resume_analysis(file_bytes: bytes, job_url: str):

    parsed_resume = parse_resume(file_bytes)
    job_details = await fetch_job_details(job_url=job_url)

    validated_job_details = await validate_job_details(job_details=job_details)

    if not validated_job_details.is_valid:
        raise HTTPException(status_code=400, detail="Invalid job details")
    
    return {
        "parsed_resume": parsed_resume,
        "job_details": validated_job_details
    }


    






