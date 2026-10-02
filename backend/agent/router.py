from agent.state import AgentState


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



def router_to_generate(state: AgentState):
    if state["iteration_loop"] < 4:
        feedbacks = state["feedbacks"].model_dump()

        for feedback in feedbacks["feedbacks"]:
            if feedback["bullet_feedbacks"] is not None:
                for bullet_feedback in feedback["bullet_feedbacks"]:
                    if not bullet_feedback["valid"]:
                        return "regenerate"

    return "done"