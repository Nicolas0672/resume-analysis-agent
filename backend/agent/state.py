from typing import Annotated, List, Literal, Optional, Sequence, TypedDict

from langgraph.graph import add_messages
from langchain_core.messages import BaseMessage

from backend.agent.model import InterviewPlan

class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]
    resume_data: dict
    job_details: dict
    candidate_profile_data: Optional[dict] 
    human_next_action: Optional[str]

    score: Literal["weak match", "good match", "strong match"]
    relevant_experience: str
    strengths: list[str]
    gaps: list[str]

    interview_plan: List[InterviewPlan]

    topic_id_selection: str

