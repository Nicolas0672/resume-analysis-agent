from typing import Optional

from pydantic import BaseModel, Field, model_validator


class JobDetails(BaseModel):
    is_valid: bool = Field(
        description="Indicates whether the details are valid for a job application"
    )

    job_title: str = Field(
        description="The title of the job position"
    )

    job_description: str = Field(
        description="The description of the job position"
    )

    job_requirements: list[str] = Field(
        description="The requirements for the job position"
    )

    job_company: str = Field(
        description="The company offering the job"
    )

    job_location: str = Field(
        description="The location of the job"
    )

    job_responsibilities: list[str] = Field(
        description="The responsibilities associated with the job position"
    )

    job_preffered_requirements: Optional[list[str]] = Field(
        description="The preffered requirements of job if listed. If none is specified, return empty list"
    )

    @model_validator(mode="after")
    def clear_fields_if_invalid(self):
        if not self.is_valid:
            self.job_title = ""
            self.job_description = ""
            self.job_requirements = ""
            self.job_company = ""
            self.job_location = ""
            self.job_responsibilities = ""
            self.job_preffered_requirements = ""

        return self