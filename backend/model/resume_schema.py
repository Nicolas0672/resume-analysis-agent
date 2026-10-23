from typing import Annotated, Any, Literal, Optional

from pydantic import BaseModel, Field
from pydantic.json_schema import SkipJsonSchema


# ==============================================================================
# Resume & Job Data Models
# ==============================================================================


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
    sentence_id: int


class ResumeExperience(BaseModel):
    entry_id: Annotated[int | None, SkipJsonSchema[None]] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    location: Optional[str] = None
    duration: Optional[str] = None
    technologies: Optional[list[str]] = None
    bullets: list[ResumeBullet] = Field(default_factory=list)


class ResumeLeadership(BaseModel):
    entry_id: Annotated[int | None, SkipJsonSchema[None]] = None
    title: str
    position: Optional[str] = None
    bullets: list[ResumeBullet] = Field(default_factory=list)
    location: Optional[str] = None
    duration: Optional[str] = None


class ResumeEducation(BaseModel):
    entry_id: Annotated[int | None, SkipJsonSchema[None]] = None
    institution: Optional[str] = None
    degree: Optional[str] = None
    field_of_study: Optional[str] = None
    location: Optional[str] = None
    duration: Optional[str] = None
    gpa: Optional[str] = None
    coursework: Optional[list[str]] = None
    sentence_ids: list[int] = Field(default_factory=list)


class ResumeProject(BaseModel):
    entry_id: Annotated[int | None, SkipJsonSchema[None]] = None
    project_name: Optional[str] = None
    technologies: Optional[list[str]] = None
    bullets: list[ResumeBullet] = Field(default_factory=list)
    role: Optional[str] = None
    location: Optional[str] = None
    duration: Optional[str] = None


class ResumeCertification(BaseModel):
    entry_id: Annotated[int | None, SkipJsonSchema[None]] = None
    name: str
    date: Optional[str] = None
    sentence_ids: list[int] = Field(default_factory=list)


class ResumeSkills(BaseModel):
    programming_languages: Optional[list[str]] = Field(default_factory=list)
    frameworks: Optional[list[str]] = Field(default_factory=list)
    libraries: Optional[list[str]] = Field(default_factory=list)
    databases: Optional[list[str]] = Field(default_factory=list)
    cloud: Optional[list[str]] = Field(default_factory=list)
    tools: Optional[list[str]] = Field(default_factory=list)
    other: Optional[list[str]] = Field(default_factory=list)
    sentence_ids: list[int] = Field(default_factory=list)


class ResumeStructure(BaseModel):
    name: Optional[str] = None
    contact: Optional[str] = None
    leadership: list[ResumeLeadership] = Field(default_factory=list)
    work_experience: list[ResumeExperience] = Field(default_factory=list)
    education: list[ResumeEducation] = Field(default_factory=list)
    projects: list[ResumeProject] = Field(default_factory=list)
    certifications: list[ResumeCertification] = Field(default_factory=list)
    skills: Optional[ResumeSkills] = None


# ==============================================================================
# Canvas Mutation Request Models (Typed JSON Payloads)
# ==============================================================================


class EditBulletRequest(BaseModel):
    session_id: str
    sentence_id: int
    new_text: str


class DeleteBulletRequest(BaseModel):
    session_id: str
    sentence_id: int


class AddBulletRequest(BaseModel):
    session_id: str
    entry_id: int
    text: str


class EditEntryRequest(BaseModel):
    session_id: str
    entry_id: int
    company: Optional[str] = None
    job_title: Optional[str] = None
    project_name: Optional[str] = None
    role: Optional[str] = None
    title: Optional[str] = None
    position: Optional[str] = None
    institution: Optional[str] = None
    degree: Optional[str] = None
    field_of_study: Optional[str] = None
    location: Optional[str] = None
    duration: Optional[str] = None
    gpa: Optional[str] = None
    coursework: Optional[list[str]] = None
    technologies: Optional[list[str]] = None
    name: Optional[str] = None
    date: Optional[str] = None


class DeleteEntryRequest(BaseModel):
    session_id: str
    entry_id: int


class AddEntryRequest(BaseModel):
    session_id: str
    section_type: Literal["work_experience", "education", "projects", "leadership", "certifications"]
    entry: dict[str, Any]


class EditSkillsRequest(BaseModel):
    session_id: str
    skills: ResumeSkills


class SyncResumeRequest(BaseModel):
    session_id: str
    resume_to_edit: ResumeStructure


# ==============================================================================
# Tailoring Request Models
# ==============================================================================


class ApplyTailoringRequest(BaseModel):
    session_id: str
    topic_id: str


class EditProposalBulletRequest(BaseModel):
    session_id: str
    topic_id: str
    sentence_id: int
    new_text: str


# ==============================================================================
# Interview Request Models
# ==============================================================================


class ChatRequest(BaseModel):
    session_id: str
    user_message: str = ""
    action: Optional[str] = None
    form_data: Optional[dict[str, Any]] = None


class ResetTopicRequest(BaseModel):
    session_id: str
    new_experience_type: Optional[str] = None
