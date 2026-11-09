

from fastapi import HTTPException, Request, logger

from agent.graph_service import delete_session_thread
from api.auth import verify_session_ownership
from core.concurrency import session_lock
from repository.resume_repository import delete_user_session


async def delete_session_service(session_id: str, user_id: str, request: Request):
    await verify_session_ownership(session_id=session_id, user_id=user_id)

    async with session_lock(session_id=session_id):

        try: 
            await delete_session_thread(session_id=session_id, request=request)
        except Exception as e:
            logger.error(f"Error deleting {session_id} from graph service: {e}")

        deleted = await delete_user_session(session_id=session_id, user_id=user_id)
        if not deleted:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to delete session {session_id} from the database. It may not exist or you may not have permission.",
            )
        # Delete from S3 (not implemented yet)

    return True
    