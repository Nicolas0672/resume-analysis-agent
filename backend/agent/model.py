from typing import List, Literal, Optional

from pydantic import BaseModel, Field

# EXPAND field to provide more context based on resume data
class CandidateAnalysis(BaseModel):
    score: Literal["weak match", "good match", "strong match"] = Field(description=
"""
Overall fit based on ALL job requirements. Be strict and evidence-based. Strong experience in a few areas does not compensate for multiple missing hard requirements.
""")
    technical_skills: Optional[list[str]] = Field(description="List of technical skills explicitly mentioned in the candidate's resume or profile data. If no technical skills are found, this field will be None")
    soft_skills: Optional[list[str]] = Field(description="List of soft skills explicitly mentioned in the candidate's resume or profile data. If no soft skills are found, this field will be None")
    project_summary: Optional[list[str]] = Field(description="A detailed summary of the candidate's projects and experience")
    work_experience_summary: Optional[list[str]] = Field(description="A detailed summary of the candidate's work experience")
    education: Optional[list[str]] = Field(description="Candidate's education or certifications. If no education is found, this field will be None")
    relevant_experience: Optional[str] = Field(description="Relevant experience from candidate's profile that closely matches the job description. If no relevant experience is found, this field will be None")
    strengths: Optional[list[str]] = Field(description="Confirmed matches, including technical skills, tools, platforms, domain knowledge, experience, education, coursework, and relevant soft skills when explicitly supported.")
    gaps: Optional[list[str]] = Field(description=
"""
Identify meaningful evidence gaps in the candidate's qualifications, skills, experience, or background relative to the job requirements.
A gap should also identify cases where the candidate has relevant experience, but important evidence is missing or unclear. For example: "Candidate worked on Project A, which is relevant to X requirement, but their specific contribution/impact/metrics are unclear."
Focus on missing or unclear responsibilities, technical details, scope, impact, outcomes, metrics, or relevance.
Do not identify gaps related to work authorization, citizenship, availability, timing, eligibility, or semester-remaining requirements.
Do not include redundant or overlapping gaps. Each gap must represent a distinct deficiency.
If no meaningful gaps are found, return an empty list.
""")
    user_message: str = Field(description="A message to the user providing insights on the candidate's resume and relevant experience.")

class InterviewDetails(BaseModel):
    topic_id: str = Field(description="Unique identifier for topic")
    priority: Literal["Low", "Medium", "High"]
    relevant_experience: list[str]
    topic: str
    reason: str
    objective: str
    job_requirement: str = Field(description="The job requirements listed for this skill")

class InterviewPlan(BaseModel):
    interview_plan: List[InterviewDetails]

class Evidence(BaseModel):
    experience_found: Optional[str]
    technologies: list[str]
    ownership: Optional[str]
    scope: Optional[str]
    metrics: Optional[str]
    impact: Optional[str]

class InvestigateOutput(BaseModel):
    need_more_info: bool = Field(description="If more context is needed to investigate candidate experience, return True, else False")
    user_message: str = Field(description="Message to the user asking for more details/clarification or letting them know they've provided enough context")
    evidence: Evidence | None

class InterviewDetailsWithEvidence(BaseModel):
    evidence: Evidence | None = Field(description="Evidence found in the candidate's resume or profile data that supports their experience and qualifications for the job requirements. If no evidence is found, this field will be None")
    interview_details: InterviewDetails | None = Field(description="Details about the interview, including the questions that will be asked and the criteria for evaluation. If no interview details are available, this field will be None")

class TailoredBullet(BaseModel):
    old_bullet: str = Field(description="The original bullet point from the candidate's resume")
    new_bullet: str = Field(description="The revised bullet point that is more tailored to the job description and highlights the candidate's relevant experience, skills, and achievements.")
    reasoning: str = Field(description="A brief explanation of why the new bullet point is more effective and relevant to the job description, including any specific skills, experiences, or achievements that were emphasized.")
    sentence_id: str = Field(description="Sentence ID from the original resume that corresponds to the old_bullet. This helps track which part of the resume was revised.")
    supporting_evidence: list[str] = Field(description="A list of evidence items that support the tailored bullet point which can include experience, skills, programming languages,metrics, and impact.")

class TailoredBullets(BaseModel):
    tailored_bullets: List[TailoredBullet] = Field(description="A list of all the tailored bullet points generated from the candidate's resume, each with its corresponding old bullet, new bullet, reasoning, and sentence ID.")


class FeedbackOnTailoredBullet(BaseModel):
    tailored_bullet: TailoredBullet
    feedback: str

class FeedbackOnTailoredBullets(BaseModel):
    feedback_on_tailored_bullets: List[FeedbackOnTailoredBullet]
    overall_status: Literal["VALID", "INVALID"] = Field(description="Overall status of the tailored bullet point based on the feedback provided. 'VALID' indicates that all factual claims in ALL bullet points are supported by evidence, while 'INVALID' indicates that at least one claim is unsupported or fabricated.")
