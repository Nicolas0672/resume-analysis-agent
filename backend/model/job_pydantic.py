from typing import Optional

from pydantic import BaseModel, Field, model_validator


class JobDetails(BaseModel):
    is_valid: bool = Field(
        description="Indicates whether the details are valid for a job application"
    )

    job_title: str = Field(
        description="The title of the job position. If title is not provided or is invalid, this field will be empty."
    )

    job_requirements: list[str] = Field(
        description="All requirements including mandatory and preferred for the job position. If requirements are not provided or are invalid, this field will be empty."
    )

    job_company: str = Field(
        description="The company offering the job. If company is not provided or is invalid, this field will be empty."
    )

    job_location: str = Field(
        description="The location of the job. If location is not provided or is invalid, this field will be empty."
    )

    job_responsibilities: list[str] = Field(
        description="The responsibilities associated with the job position. If responsibilities are not provided or are invalid, this field will be empty."
    )

