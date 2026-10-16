from langgraph.types import interrupt

from agent.state import AgentState
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

    # Smart Pre-population: Check if selected topic links to an existing resume entry
    topic_id = decision
    prepopulated_metadata = None
    if plan and getattr(plan, "interview_plan", None):
        selected_topic = next((item for item in plan.interview_plan if item.topic_id == topic_id), None)
        if selected_topic and selected_topic.relevant_experience_from_resume and state.get("resume_data"):
            for ref in selected_topic.relevant_experience_from_resume:
                entries = getattr(state["resume_data"], ref.type, [])
                entry = next((e for e in entries if getattr(e, "entry_id", None) == ref.entry_id), None)
                if entry:
                    if ref.type == "work_experience":
                        prepopulated_metadata = {
                            "experience_type": "work_experience",
                            "company": getattr(entry, "company", None),
                            "job_title": getattr(entry, "job_title", None),
                            "duration": getattr(entry, "duration", None),
                            "location": getattr(entry, "location", None),
                        }
                    elif ref.type == "projects":
                        prepopulated_metadata = {
                            "experience_type": "project",
                            "project_name": getattr(entry, "project_name", None),
                            "role": getattr(entry, "role", None),
                            "duration": getattr(entry, "duration", None),
                            "technologies": getattr(entry, "technologies", None),
                        }
                    elif ref.type == "leadership":
                        prepopulated_metadata = {
                            "experience_type": "leadership",
                            "leadership_title": getattr(entry, "title", None),
                            "position": getattr(entry, "position", None),
                            "duration": getattr(entry, "duration", None),
                            "location": getattr(entry, "location", None),
                        }
                    break

    return {
        "topic_id_selection": decision,
        "proceed_to_tailor_resume": False,
        "human_investigate_action": "chat",
        "active_experience_metadata": prepopulated_metadata,
    }

def human_investigate_chat(state: AgentState):
    payload = interrupt({
        "stage": "investigation",
        "type": "investigation_chat",
        "message": (
            state["investigation_messages"][-1].content
            if state["investigation_messages"]
            else "No previous conversation available as of current"
        ),
        "options": [
            {"id": "conclude", "label": "Wrap Up & Save Evidence"},
            {"id": "skip", "label": "Skip Topic"},
        ],
        "experience_metadata": state.get("active_experience_metadata"),
    })

    if isinstance(payload, dict):
        action = payload.get("action", "chat")
        message = payload.get("message", "")
        form_data = payload.get("form_data")
    else:
        action = "chat"
        message = str(payload) if payload is not None else ""
        form_data = None

    result = {
        "human_investigate_action": action,
    }

    if form_data:
        result["active_experience_metadata"] = form_data

    if message and str(message).strip():
        result["investigation_messages"] = [HumanMessage(content=str(message).strip())]

    return result