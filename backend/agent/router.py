from backend.agent.state import AgentState


def router_after_analysis(state: AgentState):
    return state['human_next_action']

def router_to_stop_investigation(state: AgentState):
    need_more_info = state["need_more_info"]

    if not need_more_info:
        return "END"
    else:
        return "continue"

def route_investigation_or_tailoring(state: AgentState):
    decision = state["proceed_to_tailor_resume"]

    if decision == True:
        return "proceed_to_tailor_resume"
    else:
        return "investigate_candidate"

def route_after_tailoring(state: AgentState):
    status = state.get("feedback_on_tailored_bullets", {}).overall_status

    if status == "VALID":
        return "done"
    elif status == "INVALID":
        return "tailor"

def router_to_generate(state: AgentState):
    feedbacks = state["feedbacks"].feedbacks

    if any(not feedback.valid for feedback in feedbacks):
        return "regenerate"
    else:
        return "done"
