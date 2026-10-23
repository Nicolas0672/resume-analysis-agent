from agent.state import AgentState


def route_after_analysis(state: AgentState):
    """Routes execution following initial candidate analysis:
    - 'done': End workflow
    - 'need_more_info': Proceed to interview planning
    - 'tailor': Proceed directly to evidence mapping and tailoring
    """
    return state["human_next_action"]


def route_investigation_turn(state: AgentState):
    """Determines whether candidate interview investigation should continue:
    - 'END': Wrap up investigation and return to interview planner review
    - 'continue': Continue interactive human conversational probe
    """
    need_more_info = state["need_more_info"]
    if not need_more_info:
        return "END"
    return "continue"


def route_investigation_or_tailoring(state: AgentState):
    """Routes from interview planner review either into topic investigation or tailoring."""
    decision = state["proceed_to_tailor_resume"]
    if decision:
        return "proceed_to_tailor_resume"
    return "investigate_candidate"


def route_critic_decision(state: AgentState):
    """Evaluates critic feedback for tailored bullet proposals:
    - 'regenerate': Bullet feedback requires revision (under loop limit)
    - 'done': All bullets pass or loop limit reached (max 4 iterations)
    """
    if state["iteration_loop"] < 4:
        feedbacks = state["feedbacks"].model_dump()
        for feedback in feedbacks["feedbacks"]:
            if feedback["bullet_feedbacks"] is not None:
                for bullet_feedback in feedback["bullet_feedbacks"]:
                    if not bullet_feedback["valid"]:
                        return "regenerate"

    return "done"
