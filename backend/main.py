import os
from contextlib import asynccontextmanager
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

from agent.graph import graph
from api.resume import router as resume_router
from repository.resume_repository import close_db_pool, init_db, init_db_pool


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db_pool()
    await init_db()

    DB_URI = os.environ["DATABASE_URL"]

    async with AsyncPostgresSaver.from_conn_string(DB_URI) as memory:
        await memory.setup()
        app.state.graph_with_memory = graph.compile(checkpointer=memory)
        yield

    await close_db_pool()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://resume-analysis-agent-ten.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resume_router)
