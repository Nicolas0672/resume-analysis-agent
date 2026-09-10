from urllib.parse import urlparse, parse_qs

import httpx
from bs4 import BeautifulSoup
import trafilatura

def identify_job_source(url: str) -> tuple[str | None, str | None]:
    parsed = urlparse(url)

    hostname = (parsed.hostname or "").lower()
    path = parsed.path.lower()

    # LinkedIn
    if hostname == "linkedin.com" or hostname.endswith(".linkedin.com"):

        # Normal LinkedIn job URL
        if path.startswith("/jobs/view/"):
            job_id = path.rstrip("/").split("/")[-1]

            if job_id:
                return "linkedin", job_id

        # LinkedIn search-results URL with currentJobId
        if path.startswith("/jobs/search-results/"):
            params = parse_qs(parsed.query)
            job_id = params.get("currentJobId", [None])[0]

            if job_id:
                return "linkedin", job_id

        return None, None

    # Indeed
    if hostname == "indeed.com" or hostname.endswith(".indeed.com"):

        if path.startswith("/viewjob"):
            params = parse_qs(parsed.query)
            job_id = params.get("jk", [None])[0]

            if job_id:
                return "indeed", job_id

        return None, None

    # Workday
    #
    # Examples:
    # https://company.wd1.myworkdayjobs.com/...
    # https://company.wd5.myworkdayjobs.com/...
    # https://company.wd3.myworkdayjobs.com/...
    #
    # Workday URLs are less standardized, so we identify them
    # by hostname and keep the original URL.
    if (
        hostname == "myworkdayjobs.com"
        or hostname.endswith(".myworkdayjobs.com")
    ):
        return "workday", None

    return None, None


async def fetch_job_page(job_url: str) -> str:
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/140.0.0.0 Safari/537.36"
        ),
        "Accept": (
            "text/html,application/xhtml+xml,application/xml;"
            "q=0.9,image/avif,image/webp,*/*;q=0.8"
        ),
    }

    async with httpx.AsyncClient(
        follow_redirects=True,
        timeout=15,
        headers=headers,
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


async def fetch_job_details(job_url: str) -> str:
    job_source, job_id = identify_job_source(job_url)

    if job_source == "linkedin":
        canonical_url = (
            f"https://www.linkedin.com/jobs/view/{job_id}/"
        )

    elif job_source == "indeed":
        canonical_url = job_url

    elif job_source == "workday":
        # Workday URLs vary, so keep the original URL.
        canonical_url = job_url

    else:
        raise ValueError("Unsupported job URL")

    job_text = await fetch_job_page(canonical_url)
    job_details = extract_page_content(job_text)

    # If extraction failed or returned almost no useful content,
    # treat it as a scraping failure and use the paste fallback.
    if len(job_details.strip()) < 200:
        raise ValueError(
            f"Could not extract sufficient job details from {job_source}. "
            "Please paste the job description instead."
        )

    return job_details
