import httpx
from bs4 import BeautifulSoup

async def fetch_job_page(job_url: str) -> str:
    async with httpx.AsyncClient(
        follow_redirects=False,
        timeout=10,
    ) as client:
        response = await client.get(job_url)

    response.raise_for_status()

    return response.text

def extract_job_details(job_text):
    soup = BeautifulSoup(job_text, 'html.parser')
    text = soup.get_text(
        separator="\n",
        strip=True
    )

    return text

async def fetch_job_details(job_url):
    job_text = await fetch_job_page(job_url)
    job_details = await extract_job_details(job_text)

    return job_details
