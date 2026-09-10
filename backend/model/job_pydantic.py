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


class ResumeBullet(BaseModel):
    text: str
    sentence_id: str


class ResumeExperience(BaseModel):
    entry_id: str

    company: Optional[str] = None
    job_title: Optional[str] = None
    location: Optional[str] = None
    duration: Optional[str] = None

    bullets: list[ResumeBullet] = Field(default_factory=list)

class ResumeLeadership(BaseModel):
    entry_id: str
    title: str
    position: Optional[str]
    bullets: list[ResumeBullet] = Field(default_factory=list)


class ResumeEducation(BaseModel):
    entry_id: str

    institution: Optional[str] = None
    degree: Optional[str] = None
    field_of_study: Optional[str] = None
    location: Optional[str] = None
    duration: Optional[str] = None

    gpa: Optional[str] = None
    coursework: Optional[list[str]]

    sentence_ids: list[str] = Field(default_factory=list)


class ResumeProject(BaseModel):
    entry_id: str
    project_name: Optional[str] = None
    technologies: Optional[list[str]] = None
    bullets: list[ResumeBullet] = Field(default_factory=list)


class ResumeCertification(BaseModel):
    entry_id: str
    name: str
    date: Optional[str] = None
    sentence_ids: list[str] = Field(default_factory=list)


class ResumeSkills(BaseModel):
    programming_languages: Optional[list[str]] = Field(default_factory=list)
    frameworks: Optional[list[str]] = Field(default_factory=list)
    libraries: Optional[list[str]] = Field(default_factory=list)
    databases: Optional[list[str]] = Field(default_factory=list)
    cloud: Optional[list[str]] = Field(default_factory=list)
    tools: Optional[list[str]] = Field(default_factory=list)
    other: Optional[list[str]] = Field(default_factory=list)

    sentence_ids: list[str] = Field(default_factory=list)


class ResumeStructure(BaseModel):
    name: Optional[str] = None
    contact: Optional[str] = None
    leadership: Optional[list[ResumeLeadership]]
    work_experience: list[ResumeExperience] = Field(default_factory=list)
    education: list[ResumeEducation] = Field(default_factory=list)
    projects: list[ResumeProject] = Field(default_factory=list)
    certifications: list[ResumeCertification] = Field(default_factory=list)
    skills: Optional[ResumeSkills] = None