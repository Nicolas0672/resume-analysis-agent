from langgraph.types import interrupt

from backend.agent.state import AgentState

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
                "id": "need_info",
                "label": "Investigate More"
            },
            {
                "id": "tailor",
                "label": "Tailor Candidate"
            }
        ]
    })

    return {
        "human_next_action": decision['id']
    }

def human_after_interview(state: AgentState):
    plan = state["interview_plan"]

    decision = interrupt({
        "type": "investigation_selection",
        "message": "Choose an area to start",
        "options": [
            {
                "topic_id": item['topic_id'],
                "topic": item["topic"],
                "priority": item["priority"],
                "reason": item["reason"],
                "objective": item["objective"],

            }
            for item in plan
        ] 
    })

    return {
        "topic_id_selection": decision['topic_id']
    }