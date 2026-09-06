from fastapi import Request
from langgraph.types import Command
from langgraph.graph import StateGraph, END, START
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
from langgraph.prebuilt import ToolNode
from enum import Enum

from backend.agent.nodes.human_decision import human_after_analysis, human_after_interview_planner, human_investigate_chat
from backend.agent.nodes.interview import investigate_candidate
from backend.agent.nodes.interview_planner import interview_agent
from backend.agent.nodes.tailor_agent import critique_tailored_bullet_points, tailor_resume_bullet_points
from backend.agent.router import route_after_tailoring, route_investigation_or_tailoring, router_after_analysis, router_to_stop_investigation
from backend.agent.state import AgentState
from backend.agent.nodes.analyzation import analyze_candidate
import sqlite3

class NodesNames(str, Enum):
    ANALYZE_CANDIDATE = "analyze_candidate"
    GENERATE_TAILORED_RESUME = "generate_tailored_resume"
    INTERVIEW_PLANNER = "interview_planner"
    HUMAN_AFTER_ANALYSIS = "human_after_analysis"
    HUMAN_AFTER_INTERVIEW_PLANNER = "human_after_interview_planner"
    INVESTIGATE_CANDIDATE = "investigate_candidate"
    HUMAN_INVESTIGATE_CHAT = "human_investigate_chat"
    TAILOR_RESUME_BULLET_POINTS = "tailor_resume_bullet_points"
    CRITIQUE_TAILORED_BULLET_POINTS = "critique_tailored_bullet_points"

# use for later
candidate = {
    "candidate_id": "CAND-10482",
    "name": "Alex Morgan",
    "location": "Seattle, WA",
    "education": {
        "degree": "B.S. Computer Science",
        "school": "University of Washington",
        "graduation_year": 2022
    },
    "skills": [
        "Python",
        "MongoDB",
        "AWS",
        "REST APIs",
        "Git",
        "SQL"
    ],
    "experience": [
        {
            "experience_id": "EXP-001",
            "company": "McDonald's",
            "title": "Crew Member",
            "start": "2018-06",
            "end": "2019-08",
            "description": "Served customers, handled cash, prepared orders, and worked in a fast-paced team environment."
        },
        {
            "experience_id": "EXP-002",
            "company": "Amazon",
            "title": "Operations Associate",
            "start": "2019-09",
            "end": "2020-12",
            "description": "Managed inventory workflows and helped improve warehouse processes using internal tools."
        },
        {
            "experience_id": "EXP-003",
            "company": "TechStart Labs",
            "title": "Software Engineering Intern",
            "start": "2021-06",
            "end": "2021-12",
            "description": "Built Python services and REST APIs while working with MongoDB and AWS."
        },
        {
            "experience_id": "EXP-004",
            "company": "CloudWorks",
            "title": "Software Engineer",
            "start": "2022-01",
            "end": "2025-07",
            "description": "Developed Python backend services, designed MongoDB data models, and maintained cloud-based APIs."
        }
    ],
    "summary": "Software engineer with a non-traditional background spanning retail, operations, and backend development. Experienced with Python, MongoDB, AWS, and API development."
}

graph = StateGraph(AgentState)
graph.add_node(NodesNames.ANALYZE_CANDIDATE, analyze_candidate)
graph.add_node(NodesNames.HUMAN_AFTER_ANALYSIS, human_after_analysis)
graph.add_node(NodesNames.INTERVIEW_PLANNER, interview_agent)
graph.add_node(NodesNames.HUMAN_AFTER_INTERVIEW_PLANNER, human_after_interview_planner)
graph.add_node(NodesNames.INVESTIGATE_CANDIDATE, investigate_candidate)
graph.add_node(NodesNames.HUMAN_INVESTIGATE_CHAT, human_investigate_chat)
graph.add_node(NodesNames.TAILOR_RESUME_BULLET_POINTS, tailor_resume_bullet_points)
graph.add_node(NodesNames.CRITIQUE_TAILORED_BULLET_POINTS, critique_tailored_bullet_points)


graph.add_edge(START, NodesNames.ANALYZE_CANDIDATE)
graph.add_edge(NodesNames.ANALYZE_CANDIDATE, NodesNames.HUMAN_AFTER_ANALYSIS)
graph.add_conditional_edges(NodesNames.HUMAN_AFTER_ANALYSIS, router_after_analysis, {
    "done": END,
    "need_more_info": NodesNames.INTERVIEW_PLANNER,
    "tailor": NodesNames.TAILOR_RESUME_BULLET_POINTS # Tailor
})

graph.add_edge(NodesNames.INTERVIEW_PLANNER, NodesNames.HUMAN_AFTER_INTERVIEW_PLANNER)
graph.add_conditional_edges(NodesNames.HUMAN_AFTER_INTERVIEW_PLANNER, route_investigation_or_tailoring, {
    "proceed_to_tailor_resume": NodesNames.TAILOR_RESUME_BULLET_POINTS, ##
    "investigate_candidate": NodesNames.INVESTIGATE_CANDIDATE
})

graph.add_conditional_edges(NodesNames.INVESTIGATE_CANDIDATE, router_to_stop_investigation, {
    "END": NodesNames.HUMAN_AFTER_INTERVIEW_PLANNER,
    "continue": NodesNames.HUMAN_INVESTIGATE_CHAT
})

graph.add_edge(NodesNames.HUMAN_INVESTIGATE_CHAT, NodesNames.INVESTIGATE_CANDIDATE)
graph.add_edge(NodesNames.TAILOR_RESUME_BULLET_POINTS, NodesNames.CRITIQUE_TAILORED_BULLET_POINTS)

graph.add_conditional_edges(NodesNames.CRITIQUE_TAILORED_BULLET_POINTS, route_after_tailoring, {
    "done": END,
    "tailor": NodesNames.TAILOR_RESUME_BULLET_POINTS
})




async def initialize_tailoring_session(session_id: str, parsed_resume: dict, job_details: dict, candidate_profile_data: dict = None, request: Request = None):
    config = {
        "configurable": {
            "thread_id": session_id
        }
    }

    graph_with_memory = request.app.state.graph_with_memory

    response = await graph_with_memory.ainvoke({
        "resume_data": parsed_resume,
        "job_details": job_details,
        "candidate_profile_data": candidate_profile_data
    }, config=config)

    return response

async def resume_tailoring_session(session_id: str, user_message: str, request: Request = None):
    config = {
        "configurable": {
            "thread_id": session_id
        }
    }
    graph_with_memory = request.app.state.graph_with_memory

    result = await graph_with_memory.ainvoke(
        Command(resume=user_message),
        config=config,
    )

    return normalize_graph_response(result)

async def get_session_state(session_id: str, request: Request = None):
    config = {
        "configurable": {
            "thread_id": session_id
        }
    }
    graph_with_memory = request.app.state.graph_with_memory

    state = await graph_with_memory.aget_state(config)

    return state



def normalize_graph_response(result):
    interrupts = result.get("__interrupt__")

    if interrupts:
        interrupt = interrupts[0]

        value = interrupt.value

        return {
            "stage": value.get("stage", "unknown"),
            "interrupt": {
                "type": value["type"],
                "message": value["message"],
                "options": value.get("options", []),
            },
        }

    return {
        "stage": "completed",
        "result": result,
    }
