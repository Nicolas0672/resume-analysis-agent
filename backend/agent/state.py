from operator import add
from typing import Annotated, List, Literal, Optional, Sequence, TypedDict

from langgraph.graph import add_messages
from langchain_core.messages import BaseMessage

from backend.agent.model import CandidateAnalysis, Evidence, FeedbackOnTailoredBullets, InterviewDetailsWithEvidence, InterviewPlan, TailoredBullets
from backend.model.job_pydantic import JobDetails

class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]
    resume_data: dict
    job_details: JobDetails
    candidate_analysis: CandidateAnalysis
    candidate_profile_data: Optional[dict] 
    human_next_action: Optional[str]

    score: Literal["weak match", "good match", "strong match"]
    relevant_experience: str
    strengths: list[str]
    gaps: list[str]

    interview_plan: List[InterviewPlan]

    topic_id_selection: str
    need_more_info: bool
    completed_topic_ids: Annotated[list[str], add]

    proceed_to_tailor_resume: bool

    investigation_messages: Annotated[Sequence[BaseMessage], add_messages]
    interview_details_with_evidence: Annotated[list[InterviewDetailsWithEvidence], add]

    tailored_bullets: List[TailoredBullets]
    feedback_on_tailored_bullets: FeedbackOnTailoredBullets | None

    

