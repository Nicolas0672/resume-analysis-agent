from typing import Annotated, List, Literal, Optional

from pydantic import BaseModel, Field
from pydantic.json_schema import SkipJsonSchema

from model.job_pydantic import ResumeBullet

class CandidateStrength(BaseModel):
    requirement: str
    evidence: list[str]
    explanation: str


class CandidateGap(BaseModel):
    requirement: str
    status: Literal["missing", "partial", "unclear", "transferable"]
    evidence: Optional[list[str]]
    gap: str

class CandidateAnalysis(BaseModel):
    score: Literal["weak match", "good match", "strong match"]

    relevant_experience: Optional[str]

    strengths: Optional[list[CandidateStrength]]

    gaps: Optional[list[CandidateGap]]

    user_message: str

class ResumeReference(BaseModel):
    type: Literal["projects", "work_experience", "leadership"]
    entry_id: int = Field(
    description="The entry_id of the resume entry being referenced."
        )

class InterviewDetails(BaseModel):
    # Original identifier. Globally unique 
    topic_id: str = Field(description="Unique identifier for topic")

    priority: Literal["Low", "Medium", "High"]

    topic: str = Field(
        description="Concise name for the specific investigation target."
    )

    job_requirement: str = Field(
        description="The relevant job requirement exactly as stated or faithfully represented."
    )

    reason: str = Field(
        description=(
            "Why this requirement warrants investigation for this candidate. "
            "Explain the evidence gap in candidate-specific terms rather than simply "
            "stating that the requirement is missing from the resume."
        )
    )

    objective: str = Field(
        description=(
            "What the investigation should establish. Define the specific evidence "
            "needed to determine whether this candidate can credibly demonstrate the "
            "job requirement."
        )
    )

    relevant_experience: list[str] = Field(
        description=(
            "Candidate experiences relevant or potentially relevant to the investigation. "
            "Keep experiences distinct and do not merge experiences from different sections."
        )
    )

    relevant_experience_from_resume: Optional[list[ResumeReference]] = Field(
        description=(
            "References to complete resume entries relevant to this topic. "
            "Each reference identifies an entry by type and entry_id. "
            "Return None if no relevant resume entries exist."
        )
    )

    evidence_gap: str = Field(
        description=(
        "The specific important fact, evidence, or uncertainty that is currently "
        "unknown, weak, or insufficiently demonstrated. This should describe what "
        "the interview needs to uncover, not merely repeat the job requirement."
        )
    )

class InterviewPlan(BaseModel):
    interview_plan: List[InterviewDetails]

class Evidence(BaseModel):
    project_name: str = Field(
        description="Name of the project or experience. If the candidate does not provide a name, create a concise name using only established context."
    )

    experience_found: Optional[list[str]] = Field(
        default=None,
        description="Concrete experiences, actions, responsibilities, or accomplishments discovered during the interview."
    )

    technologies: Optional[list[str]] = Field(
        default=None,
        description="Technologies, tools, frameworks, languages, or technical methods explicitly mentioned by the candidate."
    )

    ownership: Optional[list[str]] = Field(
        default=None,
        description="What the candidate personally owned, initiated, designed, implemented, or was responsible for."
    )

    scope: Optional[list[str]] = Field(
        default=None,
        description="Concrete scale or context of the work, such as users, teams, systems, programs, workload, or responsibilities."
    )

    metrics: Optional[list[str]] = Field(
        default=None,
        description="Quantitative evidence explicitly provided by the candidate. Never infer, estimate, or manufacture metrics."
    )

    impact: Optional[list[str]] = Field(
        default=None,
        description="Concrete outcomes or changes resulting from the candidate's work, using only evidence established by the candidate."
    )

    motivation: Optional[list[str]] = Field(
        default=None,
        description="Candidate-stated motivations, reasons, interests, or decisions that explain why they pursued or cared about the experience."
    )

    company: Optional[str] = None
    job_title: Optional[str] = None
    job_location: Optional[str] = None
    duration: Optional[str] = None

    candidate_statements: Optional[list[str]] = Field(
        default=None,
        description=(
            "Original statements from the candidate that directly support the extracted evidence. "
            "Preserve the candidate's wording without adding interpretation or unsupported details."
        )
    )

class WorkExperienceMetadata(BaseModel):
    experience_type: Literal["work_experience"] = Field(
        default="work_experience",
        description="Must be 'work_experience'."
    )
    company: str = Field(
        default=None,
        description="Company / employer name (REQUIRED for work experience)."
    )
    job_title: str = Field(
        default=None,
        description="Role or job title (REQUIRED for work experience)."
    )
    duration: Optional[str] = Field(
        default=None,
        description="Timeframe or dates (e.g. 'June 2022 - Aug 2023', '2024')."
    )
    location: Optional[str] = Field(
        default=None,
        description="Geographic location or 'Remote'."
    )

class ProjectMetadata(BaseModel):
    experience_type: Literal["project"] = Field(
        default="project",
        description="Must be 'project'."
    )
    project_name: str = Field(
        default=None,
        description="Name of the project (REQUIRED for project)."
    )
    role: Optional[str] = Field(
        default=None,
        description="Candidate's role in the project e.g. Lead Developer, Creator."
    )
    technologies: Optional[list[str]] = Field(
        default=None,
        description="Key technologies or tools explicitly mentioned for this project."
    )
    duration: Optional[str] = Field(
        default=None,
        description="Timeframe or duration (e.g. 'Fall 2023', '3 months')."
    )

class LeadershipMetadata(BaseModel):
    experience_type: Literal["leadership"] = Field(
        default="leadership",
        description="Must be 'leadership'."
    )
    leadership_title: str = Field(
        default=None,
        description="Organization, club, or initiative name (REQUIRED for leadership)."
    )
    position: str = Field(
        default=None,
        description="Position held e.g. President, Chair (REQUIRED for leadership)."
    )
    duration: Optional[str] = Field(
        default=None,
        description="Timeframe or dates."
    )
    location: Optional[str] = Field(
        default=None,
        description="Geographic location or 'Remote'."
    )

class OtherMetadata(BaseModel):
    experience_type: Literal["other"] = Field(
        default="other",
        description="Must be 'other'."
    )
    other_title: str = Field(
        default=None,
        description="Title or concise name of the activity/experience (REQUIRED for other)."
    )
    other_organization: Optional[str] = None
    other_role: Optional[str] = None
    other_notes: Optional[str] = None

class InitialExperienceMetadata(BaseModel):
    experience_type: Optional[Literal["work_experience", "project", "leadership", "other"]] = Field(
        default=None,
        description="The category of the single experience being explored: 'work_experience', 'proj/ect', 'leadership', or 'other'."
    )
    # Work Experience
    company: Optional[str] = Field(
        default=None,
        description="Company / employer name (if work_experience)."
    )
    job_title: Optional[str] = Field(
        default=None,
        description="Role or job title (if work_experience)."
    )
    # Project
    project_name: Optional[str] = Field(
        default=None,
        description="Name of the project (if project)."
    )
    role: Optional[str] = Field(
        default=None,
        description="Candidate's role in the project e.g. Lead Developer, Creator (if project)."
    )
    # Leadership
    leadership_title: Optional[str] = Field(
        default=None,
        description="Organization, club, or initiative name (if leadership)."
    )
    position: Optional[str] = Field(
        default=None,
        description="Position held e.g. President, Chair (if leadership)."
    )
    # Other
    other_title: Optional[str] = Field(
        default=None,
        description="Title or concise name of the activity/experience (if other)."
    )
    other_organization: Optional[str] = None
    other_role: Optional[str] = None
    other_notes: Optional[str] = None
    # Shared optional fields
    duration: Optional[str] = Field(
        default=None,
        description="Timeframe or dates (e.g. 'June 2022 - Aug 2023', '2024')."
    )
    location: Optional[str] = Field(
        default=None,
        description="Geographic location or 'Remote'."
    )
    technologies: Optional[list[str]] = Field(
        default=None,
        description="Key technologies or tools explicitly mentioned for this experience."
    )

# Alias for backwards-compatibility and general typing
ExperienceMetadata = InitialExperienceMetadata

ALLOWED_KEYS_PER_TYPE = {
    "work_experience": {"experience_type", "company", "job_title", "duration", "location"},
    "project": {"experience_type", "project_name", "role", "technologies", "duration"},
    "leadership": {"experience_type", "leadership_title", "position", "duration", "location"},
    "other": {"experience_type", "other_title", "other_organization", "other_role", "other_notes"},
}

class InvestigateOutput(BaseModel):
    need_more_info: SkipJsonSchema[bool] = True
    user_message: str = Field(description="Message to the user asking for more details/clarification or summarizing established experience")
    experience_metadata: Optional[ExperienceMetadata] = Field(
        default=None,
        description="High-level identity of the single experience being discussed. If candidate discusses multiple experiences, pick the most relevant one and do not merge."
    )
    evidence: Evidence | None = None

class WorkInvestigateOutput(BaseModel):
    need_more_info: SkipJsonSchema[bool] = True
    user_message: str = Field(description="Message to the user asking for more details/clarification.")
    experience_metadata: Optional[WorkExperienceMetadata] = Field(
        default=None,
        description="Identity details strictly for this work experience (company, job_title, duration, location). Do NOT extract project or leadership fields."
    )
    evidence: Evidence | None = None

class ProjectInvestigateOutput(BaseModel):
    need_more_info: SkipJsonSchema[bool] = True
    user_message: str = Field(description="Message to the user asking for more details/clarification.")
    experience_metadata: Optional[ProjectMetadata] = Field(
        default=None,
        description="Identity details strictly for this project (project_name, role, technologies, duration). Do NOT extract work or leadership fields."
    )
    evidence: Evidence | None = None

class LeadershipInvestigateOutput(BaseModel):
    need_more_info: SkipJsonSchema[bool] = True
    user_message: str = Field(description="Message to the user asking for more details/clarification.")
    experience_metadata: Optional[LeadershipMetadata] = Field(
        default=None,
        description="Identity details strictly for this leadership experience (leadership_title, position, duration, location). Do NOT extract work or project fields."
    )
    evidence: Evidence | None = None

class OtherInvestigateOutput(BaseModel):
    need_more_info: SkipJsonSchema[bool] = True
    user_message: str = Field(description="Message to the user asking for more details/clarification.")
    experience_metadata: Optional[OtherMetadata] = Field(
        default=None,
        description="Identity details strictly for this other experience (other_title, other_organization, other_role, other_notes)."
    )
    evidence: Evidence | None = None

SCOPED_INVESTIGATE_OUTPUT_MAP = {
    "work_experience": WorkInvestigateOutput,
    "project": ProjectInvestigateOutput,
    "leadership": LeadershipInvestigateOutput,
    "other": OtherInvestigateOutput,
}

# Not created from LLM. Manually created from evidence extracted
class EvidenceWithDetails(BaseModel):
    evidence: Evidence | None = Field(description="Evidence found in the candidate's resume or profile data that supports their experience and qualifications for the job requirements. If no evidence is found, this field will be None")
    job_requirement: str
    topic_id: str

class EvidenceMapping(BaseModel):
    evidence_with_details: EvidenceWithDetails 
    resume_reference: Optional[ResumeReference] = None, Field(
        description="Reference to the specific resume entry that supports the evidence. If no matching resume entry is found, this field will be None."
    )
    mapping_status: Literal["MATCHED", "UNMATCHED"] = Field(
        description="MATCHED if there is a reference to the specific resume entry that supports the evidence.; otherwise UNMATCHED."
    )
    reasoning: Optional[str] = None

class EvidenceMappingResult(BaseModel):
    evidence_mappings: List[EvidenceMapping]

class TailorDecisionMatched(BaseModel):
    action: Literal["KEEP", "MODIFY", "ADD"]
    old_bullet: Optional[ResumeBullet] 
    new_bullet: Optional[ResumeBullet] = Field(description="New bulletpoint points, utilizing XYZ format, accomplished X, as measured by Y, by doing Z, if enough details is present such as metrics/impact. Ensure bullet points created are aligned with job requirement. Do not invent metrics or details if not present")
    reasoning: str
    evidence: list[str]

class TailorMatched(BaseModel):
    decisions: list[TailorDecisionMatched]

    resume_reference: ResumeReference = Field(description="Reference to the specific resume entry)")
    topic_id: str = Field(
        description=(
            "Copy the topic_id from the corresponding input exactly. "
            "Never modify, generate, or invent a topic_id."
        )
    )

class TailorDecisionUnmatched(BaseModel):
    action: Literal["ADD"]
    old_bullet: SkipJsonSchema[None] = None    
    new_bullet: ResumeBullet = Field(description="New bulletpoint points, utilizing XYZ format, accomplished X, as measured by Y, by doing Z, if enough details is present such as metrics/impact. Ensure bullet points created are aligned with job requirement. Do not invent metrics or details if not present")
    reasoning: str
    evidence: list[str]

class TailorUnmatched(BaseModel):
    decisions: list[TailorDecisionUnmatched]
    type: Literal["leadership", "work_experience", "projects"]
    company_name: Optional[str] = Field("Company name if experience learned from work. Otherwise return None")
    duration: Optional[str] = Field("Duration of work experience if provided. Example: Dec 2024 - Present")
    job_location: Optional[str]
    job_title: Optional[str] = Field("Job title at company if experienced learned from work. Otherwise return None")
    skills: Optional[list[str]] = Field("List of technologies or skills that was used from the experience")
    project_name: Optional[str] = Field("Project name where experience was learned. Return None if experience was learned from work")
    topic_id: str = Field(
        description=(
            "Copy the topic_id from the corresponding input exactly. "
            "Never modify, generate, or invent a topic_id."
        )
    )
    leadership_position: Optional[str] 
    leadership_title: Optional[str]
    
class TailorMatchList(BaseModel):
    tailor_matched: List[TailorMatched]

class TailorUnmatchedList(BaseModel):
    tailor_unmatched: List[TailorUnmatched]

class TailorAnalysis(BaseModel):
    tailor_matched_list: list[TailorMatched] = []
    tailor_unmatched_list: list[TailorUnmatched] = []

class BulletFeedback(BaseModel):
    valid: bool = Field(
        description="Whether the proposed bullet is factually supported by the candidate's evidence."
    )

    suggestions: str = Field(
        description="If invalid, identify the specific claim that is unsupported or missing evidence, state that the claim must be removed or corrected, and explain which evidence limitation makes it inaccurate. If valid, state that no factual correction is required."
    )

    sentence_id: int

class Feedback(BaseModel):
    bullet_feedbacks: list[BulletFeedback]

    topic_id: SkipJsonSchema[str] = None


class RegeneratedBullets(BaseModel):
    topic_id: str = Field(
        description=(
            "Copy the topic_id from the corresponding input exactly. "
            "Never modify, generate, or invent a topic_id."
        )
    )
    new_bullet_points: list[ResumeBullet] = Field(description="New bulletpoint points, utilizing XYZ format, accomplished X, as measured by Y, by doing Z, if enough details is present such as metrics/impact. Ensure bullet points created are aligned with job requirement. Do not invent metrics or details if not present")
    reasoning: str

class Feedbacks(BaseModel):
    feedbacks: List[Feedback]

class RegeneratedBulletsList(BaseModel):
    regenerated_bullet_list: List[RegeneratedBullets]

















