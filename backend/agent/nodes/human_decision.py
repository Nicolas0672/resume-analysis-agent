from langgraph.types import interrupt

from backend.agent.state import AgentState
from langchain_core.messages import HumanMessage

def human_after_analysis(state: AgentState):
    decision = interrupt({
        "type": "candidate_review",
        "message": "What would you like to do?",
        "options": [
            {
                "id": "done",
                "label": "Finish Review"
            },
            {
                "id": "need_more_info",
                "label": "Investigate More"
            },
            {
                "id": "tailor",
                "label": "Tailor Candidate"
            }
        ]
    })

    return {
        "human_next_action": decision
    }

def human_after_interview_planner(state: AgentState):
    plan = state["interview_plan"]
    completed_topic_ids = state["completed_topic_ids"]

    options = [
        {
            "id": item.topic_id,
            "topic": item.topic,
            "priority": item.priority,
            "reason": item.reason,
            "objective": item.objective,
            "job_requirement": item.job_requirement,
        }
        for item in plan.interview_plan
        if item.topic_id not in completed_topic_ids
    ]

    options.append({
        "id": "end",
        "label": "Done",
    })

    decision = interrupt({
        "type": "investigation_selection",
        "message": "Choose an area to start",
        "options": options,
    })

    if decision == "end":
        return {
            "topic_id_selection": None,
            "proceed_to_tailor_resume": True
        }

    return {
        "topic_id_selection": decision,
        "proceed_to_tailor_resume": False

    }

def human_investigate_chat(state: AgentState):
    answer = interrupt({
        "stage": "investigation",
        "type": "investigation_chat",
        "message": (
            state["investigation_messages"][-1].content
            if state["investigation_messages"]
            else "No previous conversation available as of current"
        ),
        "options": [],
    })

    return {
        "investigation_messages": [HumanMessage(content=answer)]
    }