from fastapi import Request
from langgraph.types import Command



async def initialize_tailoring_session(session_id: str, parsed_resume: dict, job_details: dict, candidate_profile_data: dict = None, request: Request = None):
    config = {
        "configurable": {
            "thread_id": session_id
        }
    }

    graph_with_memory = request.app.state.graph_with_memory

    response = await graph_with_memory.ainvoke({
        "resume_data": parsed_resume,
        "resume_to_edit": parsed_resume,
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

    return {
            "stage": "active",
            "state": state.values,
            "next": state.next,
        }



def normalize_graph_response(result):
    interrupts = result.get("__interrupt__", "")

    if interrupts:
        interrupt = interrupts[0]

        value = interrupt.value

        return {
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
