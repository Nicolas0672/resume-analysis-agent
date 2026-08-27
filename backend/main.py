import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

from fastapi import FastAPI
from backend.api.resume import router as resume_router

app = FastAPI()

app.include_router(resume_router)