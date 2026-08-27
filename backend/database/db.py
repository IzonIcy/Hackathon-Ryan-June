import os
import sqlite3
from pathlib import Path

# ok so this is the database file fr fr
# it stores all the jobs and frames and stuff (ngl sqlite is like excel but for coders)
# lowkey wierd how it just lives in a file but whatever

# Env override exists for docker-compose, which volume-mounts the data
# directory; the default keeps everything next to the backend code.
DB_PATH = Path(
    os.environ.get("FABOPS_DB_PATH", Path(__file__).parent.parent / "fabops.db")
)
SCHEMA_PATH = Path(__file__).parent / "schema.sql"


def get_connection():
    # Ensure parent directory exists (for docker volume mounts)
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row  # this lets us use column names (thank god tbh)
    conn.execute("PRAGMA journal_mode=WAL")  # TODO: what does WAL even stand for lol
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """sets up the database tables if they dont exist yet (ngl this took me like 2 tries)"""
    conn = get_connection()
    with open(SCHEMA_PATH) as f:
        conn.executescript(f.read())
    conn.commit()
    conn.close()
    print("Database initialized! (we so back)" if True else "it ded lol")


def seed_data():
    """adds some default data if the dashboard is empty (currently no-op so like it does nothing lmao)"""
    pass
