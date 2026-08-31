from backend.agent.state import AgentState


def router_after_analysis(state: AgentState):
    return state['human_next_action']