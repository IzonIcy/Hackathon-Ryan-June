"""
FabOps Sentinel - Backend Server

this is the main file that starts everything up
it creates the fastapi app and connects all the routes

to run: uvicorn main:app --reload
or: python -m uvicorn main:app --reload
"""

from dotenv import load_dotenv
from pathlib import Path

# load the .env file so OPENAI_API_KEY is available everywhere
load_dotenv(Path(__file__).parent / ".env")

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.db import init_db
from routers import machines, jobs, frames, reports, sessions, seed


@asynccontextmanager
async def lifespan(application: FastAPI):
    """runs once when the server starts, sets up the database tables"""
    init_db()
    print("=== FabOps Sentinel is running! ===")
    print("API docs at http://localhost:8000/docs")
    yield
    # cleanup goes here if needed


# create the app!
app = FastAPI(
    title="FabOps Sentinel",
    description="AI that watches your 3d printer, laser cutter, and cnc",
    version="0.1.0",
    lifespan=lifespan,
)

# this lets the frontend (localhost:5173) talk to the backend
# without getting CORS errors (that was so annoying to figure out)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# connect all the route files
app.include_router(machines.router)
app.include_router(jobs.router)
app.include_router(frames.router)
app.include_router(reports.router)
app.include_router(sessions.router)
app.include_router(seed.router)


@app.get("/api/health")
def health_check():
    """just checks the server is alive"""
    return {"status": "ok", "service": "FabOps Sentinel"}


@app.get("/")
def root():
    return {"message": "FabOps Sentinel API is running! 🎉"}
