from contextlib import asynccontextmanager
import os
from pathlib import Path
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
from backend.agent.graph import graph

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

from fastapi import FastAPI
from backend.api.resume import router as resume_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],            # GET, POST, etc.
    allow_headers=["*"],            # all headers
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with AsyncSqliteSaver.from_conn_string(
        "backend/data/app.db"
    ) as memory:
        # Compile your graph using this checkpointer
        app.state.graph_with_memory = graph.compile(checkpointer=memory)

        yield

app = FastAPI(lifespan=lifespan)

app.include_router(resume_router)