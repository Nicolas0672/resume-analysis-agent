from pydantic import BaseModel, HttpUrl

class JobRequest(BaseModel):
    job_url: HttpUrl

class JobDetails(BaseModel):
    is_valid: bool
    job_title: str
    job_description: str
    job_requirements: str
    job_company: str
    job_location: str