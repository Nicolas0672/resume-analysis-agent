"""Central API Router aggregating domain-specific routers under /api:
- /api/upload: Document ingestion, security validation, and session initiation
- /api/interview: Conversational probe, SSE streaming, topic reset, session state
- /api/canvas: Live working resume mutations (bullets, entries, skills, full sync)
- /api/tailor: Proposed tailoring actions (apply topic, customize proposal bullets)
- /api/sessions: Candidate session ownership and history
- /api/export: ATS-optimized PDF and Word DOCX document generation
"""

from fastapi import APIRouter

from api.routers.canvas import router as canvas_router
from api.routers.export import router as export_router
from api.routers.ingestion import router as ingestion_router
from api.routers.interview import router as interview_router
from api.routers.sessions import router as sessions_router
from api.routers.tailoring import router as tailoring_router

router = APIRouter(prefix="/api")

router.include_router(ingestion_router)
router.include_router(interview_router)
router.include_router(canvas_router)
router.include_router(tailoring_router)
router.include_router(sessions_router)
router.include_router(export_router)

__all__ = ["router"]
