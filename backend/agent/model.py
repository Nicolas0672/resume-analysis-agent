from typing import Annotated, List, Literal, Optional

from pydantic import BaseModel, Field, model_validator
from pydantic.json_schema import SkipJsonSchema

from model.resume_schema import ResumeBullet

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
    experience_type: Optional[Literal["work_experience", "project", "leadership", "other"]] = Field(
        default=None,
        description="The type of experience: 'work_experience', 'project', 'leadership', or 'other'."
    )

    project_name: Optional[str] = Field(
        default=None,
        description="Name of the project or experience, if applicable. If the candidate does not provide a name, create a concise name using only established context."
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

    leadership_title: Optional[str] = None
    leadership_position: Optional[str] = None
    other_title: Optional[str] = None

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
        description="The category of the single experience being explored: 'work_experience', 'project', 'leadership', or 'other'."
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

class BaseInvestigateOutput(BaseModel):
    need_more_info: SkipJsonSchema[bool] = True
    is_sufficient: bool = Field(
        default=False,
        description=(
            "Set to True ONLY when the candidate has provided concrete, verifiable evidence "
            "(actions, technical methods, problem context, and outcomes or critical trade-offs) demonstrating the target requirement "
            "within this active experience. "
            "MUST be False if key evidence is still missing, if the candidate lacked experience with this requirement, "
            "or if the skill was gained elsewhere."
        )
    )
    suggested_experience_tab: Optional[Literal["work_experience", "project", "leadership", "other"]] = Field(
        default=None,
        description=(
            "If the candidate indicates that the probed skill/requirement was gained or applied in a "
            "different experience category (e.g. in an internship or job -> 'work_experience', personal or academic project -> 'project', "
            "club or leadership initiative -> 'leadership', other -> 'other'), specify that category here. Otherwise None."
        )
    )
    evidence: Evidence | None = None

    @model_validator(mode="after")
    def enforce_invariants(self):
        if self.suggested_experience_tab is not None:
            self.is_sufficient = False
        return self

class InvestigateOutput(BaseInvestigateOutput):
    user_message: str = Field(
        description=(
            "Conversational response to the candidate adhering to the 4 Turn States: "
            "1. If is_sufficient is True: DO NOT ask any more questions. Warmly and concisely summarize the strong evidence gathered and invite them to click 'Wrap Up & Save Evidence'. "
            "2. If suggested_experience_tab is set: warmly acknowledge where the skill was gained and explicitly instruct them to switch to that tab on the right so it can be captured accurately; DO NOT confirm as proceed or invite wrap-up. "
            "3. If candidate confirms no experience with this requirement anywhere: politely acknowledge, reassure them, and suggest using 'Skip Topic' to proceed. "
            "4. Otherwise: ask the single next high-leverage probing question directly investigating this objective."
        )
    )
    experience_metadata: Optional[ExperienceMetadata] = Field(
        default=None,
        description="High-level identity of the single experience being discussed. If candidate discusses multiple experiences, pick the most relevant one and do not merge."
    )

class InitialInvestigateOutput(BaseInvestigateOutput):
    """
    Used strictly during Initial Experience Discovery when active_type is None.
    Redirection is impossible because no active tab has been chosen yet.
    """
    suggested_experience_tab: Optional[Literal[None]] = Field(
        default=None,
        description="MUST be None during initial discovery because no active tab is established yet."
    )
    user_message: str = Field(
        description=(
            "Conversational opening question to discover which experience the candidate demonstrated this requirement in. "
            "If relevant experiences are listed from their resume, warmly reference them and ask if they developed the skill there or elsewhere. "
            "DO NOT suggest switching tabs because no active tab has been chosen yet. "
            "Ask EXACTLY ONE high-leverage opening question."
        )
    )
    experience_metadata: Optional[ExperienceMetadata] = Field(
        default=None,
        description="High-level identity of the single experience if mentioned by the candidate."
    )

class WorkInvestigateOutput(BaseInvestigateOutput):
    suggested_experience_tab: Optional[Literal["project", "leadership", "other"]] = Field(
        default=None,
        description=(
            "If the candidate indicates that the probed skill/requirement was gained in a DIFFERENT experience category "
            "(e.g. personal/academic project -> 'project', club/activity -> 'leadership', other -> 'other'), specify that category here. "
            "MUST be None if discussing any work experience, employment, or internship."
        )
    )
    user_message: str = Field(
        description=(
            "Conversational response to the candidate regarding this work experience: "
            "1. If is_sufficient is True: DO NOT ask any more questions. Warmly summarize the strong evidence gathered and invite them to click 'Wrap Up & Save Evidence'. "
            "2. If suggested_experience_tab is set: warmly acknowledge where the skill was gained and explicitly instruct them to switch to that tab on the right (e.g. Project, Leadership, Other); DO NOT confirm as proceed or invite wrap-up. "
            "3. If candidate confirms no experience with this requirement anywhere: politely acknowledge, reassure them, and suggest using 'Skip Topic'. "
            "4. Otherwise: ask the single next question directly investigating this objective within this work experience."
        )
    )
    experience_metadata: Optional[WorkExperienceMetadata] = Field(
        default=None,
        description="Identity details strictly for this work experience (company, job_title, duration, location). Do NOT extract project or leadership fields."
    )

class ProjectInvestigateOutput(BaseInvestigateOutput):
    suggested_experience_tab: Optional[Literal["work_experience", "leadership", "other"]] = Field(
        default=None,
        description=(
            "If the candidate indicates that the probed skill/requirement was gained in a DIFFERENT experience category "
            "(e.g. internship/job -> 'work_experience', club/activity -> 'leadership', other -> 'other'), specify that category here. "
            "MUST be None if discussing projects."
        )
    )
    user_message: str = Field(
        description=(
            "Conversational response to the candidate regarding this project: "
            "1. If is_sufficient is True: DO NOT ask any more questions. Warmly summarize the strong evidence gathered and invite them to click 'Wrap Up & Save Evidence'. "
            "2. If suggested_experience_tab is set: warmly acknowledge where the skill was gained and explicitly instruct them to switch to that tab on the right (e.g. Work Experience for internship/job, Leadership, Other); DO NOT confirm as proceed or invite wrap-up. "
            "3. If candidate confirms no experience with this requirement anywhere: politely acknowledge, reassure them, and suggest using 'Skip Topic'. "
            "4. Otherwise: ask the single next question directly investigating this objective within this project."
        )
    )
    experience_metadata: Optional[ProjectMetadata] = Field(
        default=None,
        description="Identity details strictly for this project (project_name, role, technologies, duration). Do NOT extract work or leadership fields."
    )

class LeadershipInvestigateOutput(BaseInvestigateOutput):
    suggested_experience_tab: Optional[Literal["work_experience", "project", "other"]] = Field(
        default=None,
        description=(
            "If the candidate indicates that the probed skill/requirement was gained in a DIFFERENT experience category "
            "(e.g. internship/job -> 'work_experience', project -> 'project', other -> 'other'), specify that category here. "
            "MUST be None if discussing leadership or clubs."
        )
    )
    user_message: str = Field(
        description=(
            "Conversational response to the candidate regarding this leadership experience: "
            "1. If is_sufficient is True: DO NOT ask any more questions. Warmly summarize the strong evidence gathered and invite them to click 'Wrap Up & Save Evidence'. "
            "2. If suggested_experience_tab is set: warmly acknowledge where the skill was gained and explicitly instruct them to switch to that tab on the right (e.g. Work Experience, Project, Other); DO NOT confirm as proceed or invite wrap-up. "
            "3. If candidate confirms no experience with this requirement anywhere: politely acknowledge, reassure them, and suggest using 'Skip Topic'. "
            "4. Otherwise: ask the single next question directly investigating this objective within this leadership experience."
        )
    )
    experience_metadata: Optional[LeadershipMetadata] = Field(
        default=None,
        description="Identity details strictly for this leadership experience (leadership_title, position, duration, location). Do NOT extract work or project fields."
    )

class OtherInvestigateOutput(BaseInvestigateOutput):
    suggested_experience_tab: Optional[Literal["work_experience", "project", "leadership"]] = Field(
        default=None,
        description=(
            "If the candidate indicates that the probed skill/requirement was gained in a DIFFERENT experience category "
            "(e.g. internship/job -> 'work_experience', project -> 'project', club -> 'leadership'), specify that category here. "
            "MUST be None if discussing other experiences."
        )
    )
    user_message: str = Field(
        description=(
            "Conversational response to the candidate regarding this experience: "
            "1. If is_sufficient is True: DO NOT ask any more questions. Warmly summarize the strong evidence gathered and invite them to click 'Wrap Up & Save Evidence'. "
            "2. If suggested_experience_tab is set: warmly acknowledge where the skill was gained and explicitly instruct them to switch to that tab on the right; DO NOT confirm as proceed or invite wrap-up. "
            "3. If candidate confirms no experience with this requirement anywhere: politely acknowledge, reassure them, and suggest using 'Skip Topic'. "
            "4. Otherwise: ask the single next question directly investigating this objective within this other experience."
        )
    )
    experience_metadata: Optional[OtherMetadata] = Field(
        default=None,
        description="Identity details strictly for this other experience (other_title, other_organization, other_role, other_notes)."
    )

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
    company_name: Optional[str] = Field(default=None, description="Company name if experience learned from work. Otherwise return None")
    duration: Optional[str] = Field(default=None, description="Duration of work experience if provided. Example: Dec 2024 - Present")
    job_location: Optional[str] = None
    job_title: Optional[str] = Field(default=None, description="Job title at company if experienced learned from work. Otherwise return None")
    skills: Optional[list[str]] = Field(default=None, description="List of technologies or skills that was used from the experience")
    project_name: Optional[str] = Field(default=None, description="Project name where experience was learned. Return None if experience was learned from work")
    topic_id: str = Field(
        description=(
            "Copy the topic_id from the corresponding input exactly. "
            "Never modify, generate, or invent a topic_id."
        )
    )
    leadership_position: Optional[str] = None
    leadership_title: Optional[str] = None
    
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

















