from contextlib import asynccontextmanager
import os
from pathlib import Path
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
from backend.agent.graph import graph
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

from fastapi import FastAPI
from backend.api.resume import router as resume_router
from fastapi.middleware.cors import CORSMiddleware

from backend.repository.resume_repository import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()

    DB_URI = os.environ["DATABASE_URL"]

    async with AsyncPostgresSaver.from_conn_string(DB_URI) as memory:
        await memory.setup()

        app.state.graph_with_memory = graph.compile(
            checkpointer=memory
        )

        yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://resume-analysis-agent-ten.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],            # GET, POST, etc.
    allow_headers=["*"],            # all headers
)

app.include_router(resume_router)