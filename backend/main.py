"""
FabOps Sentinel - Backend Server

yo this is like the main file that starts everythin up fr fr
it creates the fastapi app and hooks up all the routes n stuff

to run: uvicorn main:app --reload
or like: python -m uvicorn main:app --reload (idk either works lol)
"""

from dotenv import load_dotenv
from pathlib import Path
import os
import uvicorn

print("FabOps Sentinel booting up...")

# TODO: fix this lol - load the .env file so OPENAI_API_KEY is available everywhere
load_dotenv(Path(__file__).parent / ".env")

# check if the API key was loaded (saves us from debugging later lol)
_api_key = os.getenv("OPENAI_API_KEY")
if _api_key:
    print(f"[config] OPENAI_API_KEY loaded: {_api_key[:15]}...")
else:
    print("[config] ⚠️  WARNING: OPENAI_API_KEY not found in .env!")
print(
    f"[config] OPENAI_BASE_URL = {os.getenv('OPENAI_BASE_URL', 'https://api.openai.com/v1')}"
)
print(f"[config] OPENAI_MODEL = {os.getenv('OPENAI_MODEL', 'gpt-4o-mini')}")

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.db import init_db
from routers import machines, jobs, frames, reports, sessions, seed


@asynccontextmanager
async def lifespan(application: FastAPI):
    """runs once when the server starts, sets up the database tables n stuff"""
    init_db()
    print("=== FabOps Sentinel is running! (no cap) ===")
    print("API docs at http://localhost:8000/docs")
    yield
    # cleanup goes here if needed (but like, do we even need it? lmao)


# create the app!
app = FastAPI(
    title="FabOps Sentinel",
    description="AI that watches your 3d printer, laser cutter, and cnc",
    version="0.1.0",
    lifespan=lifespan,
)

# this took me forever to figure out omg
# lets the frontend (localhost:5173) talk to the backend
# without getting CORS errors (that was so annoying to figure out fr fr)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# maybe we need a healthcheck router too idk
# app.include_router(health_check_router)  # TODO: fix this lol

# connect all the route files (lowkey there's alot of them)
app.include_router(machines.router)
app.include_router(jobs.router)
app.include_router(frames.router)
app.include_router(reports.router)
app.include_router(sessions.router)
app.include_router(seed.router)


@app.get("/api/health")
def health_check():
    """just checks the server is alive (hopefully lol)"""
    return {"status": "ok", "service": "FabOps Sentinel"}


@app.get("/")
def root():
    """home page idk why anyone would go here but whatev"""
    return {"message": "FabOps Sentinel API is running! 🎉"}


def main():
    """start the API server when running this file directly"""
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)


if __name__ == "__main__":
    main()
