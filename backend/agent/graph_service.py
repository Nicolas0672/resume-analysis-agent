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
        "candidate_profile_data": candidate_profile_data,
        "applied_tailored_topic_ids": [],
    }, config=config)

    return response

async def resume_tailoring_session(session_id: str, user_message: str, request: Request = None):
    config = {
        "configurable": {
            "thread_id": session_id
        }
    }
    graph_with_memory = request.app.state.graph_with_memory

    # State guard: Prevent cross-topic injection while an active question probe is pending
    state = await graph_with_memory.aget_state(config)
    next_nodes = state.next if state else ()

    if "human_investigate_chat" in next_nodes:
        plan = state.values.get("interview_plan") if state and state.values else None
        if plan and hasattr(plan, "interview_plan"):
            known_topic_ids = {t.topic_id for t in plan.interview_plan}
            if user_message.strip() in known_topic_ids:
                from fastapi import HTTPException
                raise HTTPException(
                    status_code=400,
                    detail=f"Active investigation probe in progress. Cannot switch to topic '{user_message}' while a question is pending.",
                )

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
