from urllib.parse import urlparse, parse_qs

import httpx
from bs4 import BeautifulSoup
import trafilatura

def identify_job_source(url: str) -> tuple[str | None, str | None]:
    parsed = urlparse(url)

    hostname = (parsed.hostname or "").lower()
    path = parsed.path.lower()

    if hostname == "linkedin.com" or hostname.endswith(".linkedin.com"):

        # Normal LinkedIn job URL
        if path.startswith("/jobs/view/"):
            job_id = path.rstrip("/").split("/")[-1]
            return "linkedin", job_id

        # LinkedIn search-results URL with currentJobId
        if path.startswith("/jobs/search-results/"):
            params = parse_qs(parsed.query)
            job_id = params.get("currentJobId", [None])[0]

            if job_id:
                return "linkedin", job_id

        return None, None

    if hostname == "indeed.com" or hostname.endswith(".indeed.com"):

        if path.startswith("/viewjob"):
            params = parse_qs(parsed.query)
            job_id = params.get("jk", [None])[0]

            if job_id:
                return "indeed", job_id

        return None, None

    return None, None

async def fetch_job_page(job_url: str) -> str:
    async with httpx.AsyncClient(
        follow_redirects=False,
        timeout=10,
    ) as client:
        response = await client.get(job_url)

    response.raise_for_status()

    return response.text

def extract_page_content(html: str) -> str:
    text = trafilatura.extract(
        html,
        include_comments=False,
        include_tables=False,
        include_links=False,
    )

    return text or ""

async def fetch_job_details(job_url):
    job_source, job_id = identify_job_source(job_url)

    if job_source == "linkedin":
        canonical_url = f"https://www.linkedin.com/jobs/view/{job_id}/"

    elif job_source == "indeed":
        canonical_url = job_url

    else:
        raise ValueError("Unsupported job URL")
    
    job_text = await fetch_job_page(canonical_url)
    job_details = extract_page_content(job_text)

    return job_details
