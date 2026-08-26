
from job_fetcher import fetch_job_details
from document_parser import open_docx, parse_docx


async def process_resume_analysis(file_bytes: bytes, job_url: str):

    paragraphs = parse_resume(file_bytes)

    fetched_job_details = await fetch_job_details(job_url=job_url)


def parse_resume(file_bytes: bytes):
    doc = open_docx(file_bytes)
    return parse_docx(doc)


