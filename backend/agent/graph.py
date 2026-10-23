from enum import Enum
from langgraph.graph import END, START, StateGraph

from agent.nodes.analysis import analyze_candidate
from agent.nodes.human_decision import (
    human_after_analysis,
    human_after_interview_planner,
    human_investigate_chat,
)
from agent.nodes.interview import investigate_candidate, reset_investigation
from agent.nodes.interview_planner import plan_interview
from agent.nodes.tailor_agent import (
    critique_tailored_bullet_points,
    evidence_mapper,
    regenerate_bullets,
    tailor_resume_bullet_points,
)
from agent.router import (
    route_after_analysis,
    route_critic_decision,
    route_investigation_or_tailoring,
    route_investigation_turn,
)
from agent.state import AgentState


class NodesNames(str, Enum):
    ANALYZE_CANDIDATE = "analyze_candidate"
    INTERVIEW_PLANNER = "interview_planner"
    HUMAN_AFTER_ANALYSIS = "human_after_analysis"
    HUMAN_AFTER_INTERVIEW_PLANNER = "human_after_interview_planner"
    INVESTIGATE_CANDIDATE = "investigate_candidate"
    HUMAN_INVESTIGATE_CHAT = "human_investigate_chat"
    TAILOR_RESUME_BULLET_POINTS = "tailor_resume_bullet_points"
    CRITIQUE_TAILORED_BULLET_POINTS = "critique_tailored_bullet_points"
    EVIDENCE_MAPPER = "evidence_mapper"
    REGENERATE = "regenerate"
    RESET_INVESTIGATION = "reset_investigation"


graph = StateGraph(AgentState)
graph.add_node(NodesNames.ANALYZE_CANDIDATE, analyze_candidate)
graph.add_node(NodesNames.HUMAN_AFTER_ANALYSIS, human_after_analysis)
graph.add_node(NodesNames.INTERVIEW_PLANNER, plan_interview)
graph.add_node(NodesNames.HUMAN_AFTER_INTERVIEW_PLANNER, human_after_interview_planner)
graph.add_node(NodesNames.INVESTIGATE_CANDIDATE, investigate_candidate)
graph.add_node(NodesNames.HUMAN_INVESTIGATE_CHAT, human_investigate_chat)
graph.add_node(NodesNames.TAILOR_RESUME_BULLET_POINTS, tailor_resume_bullet_points)
graph.add_node(NodesNames.CRITIQUE_TAILORED_BULLET_POINTS, critique_tailored_bullet_points)
graph.add_node(NodesNames.EVIDENCE_MAPPER, evidence_mapper)
graph.add_node(NodesNames.REGENERATE, regenerate_bullets)
graph.add_node(NodesNames.RESET_INVESTIGATION, reset_investigation)

graph.add_edge(START, NodesNames.ANALYZE_CANDIDATE)
graph.add_edge(NodesNames.ANALYZE_CANDIDATE, NodesNames.HUMAN_AFTER_ANALYSIS)
graph.add_conditional_edges(
    NodesNames.HUMAN_AFTER_ANALYSIS,
    route_after_analysis,
    {
        "done": END,
        "need_more_info": NodesNames.INTERVIEW_PLANNER,
        "tailor": NodesNames.EVIDENCE_MAPPER,
    },
)

graph.add_edge(NodesNames.INTERVIEW_PLANNER, NodesNames.HUMAN_AFTER_INTERVIEW_PLANNER)
graph.add_conditional_edges(
    NodesNames.HUMAN_AFTER_INTERVIEW_PLANNER,
    route_investigation_or_tailoring,
    {
        "proceed_to_tailor_resume": NodesNames.EVIDENCE_MAPPER,
        "investigate_candidate": NodesNames.RESET_INVESTIGATION,
    },
)

graph.add_edge(NodesNames.RESET_INVESTIGATION, NodesNames.INVESTIGATE_CANDIDATE)

graph.add_conditional_edges(
    NodesNames.INVESTIGATE_CANDIDATE,
    route_investigation_turn,
    {
        "END": NodesNames.HUMAN_AFTER_INTERVIEW_PLANNER,
        "continue": NodesNames.HUMAN_INVESTIGATE_CHAT,
    },
)

graph.add_edge(NodesNames.HUMAN_INVESTIGATE_CHAT, NodesNames.INVESTIGATE_CANDIDATE)
graph.add_edge(NodesNames.EVIDENCE_MAPPER, NodesNames.TAILOR_RESUME_BULLET_POINTS)
graph.add_edge(NodesNames.TAILOR_RESUME_BULLET_POINTS, NodesNames.CRITIQUE_TAILORED_BULLET_POINTS)
graph.add_conditional_edges(
    NodesNames.CRITIQUE_TAILORED_BULLET_POINTS,
    route_critic_decision,
    {
        "regenerate": NodesNames.REGENERATE,
        "done": END,
    },
)

graph.add_edge(NodesNames.REGENERATE, NodesNames.CRITIQUE_TAILORED_BULLET_POINTS)
