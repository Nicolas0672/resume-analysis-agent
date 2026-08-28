from langgraph.graph import StateGraph, END, START
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import ToolNode

from backend.agent.state import AgentState

def initialize_tailoring_session(session_id: str, parsed_resume: dict, job_details: dict):
    memory = MemorySaver()
    config = {
        "configurable": {
            "thread_id": session_id
        }
    }

    graph = StateGraph(AgentState)



    
    graph_with_memory = graph.compile(checkpointer=memory)
