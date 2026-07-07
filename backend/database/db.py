import sqlite3
from pathlib import Path

# ok so this is the database file
# it stores all the jobs and frames and stuff

DB_PATH = Path(__file__).parent.parent / "fabops.db"
SCHEMA_PATH = Path(__file__).parent / "schema.sql"


def get_connection():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row  # this lets us use column names
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """sets up the database tables if they dont exist yet"""
    conn = get_connection()
    with open(SCHEMA_PATH) as f:
        conn.executescript(f.read())
    conn.commit()
    conn.close()
    print("Database initialized!")


def seed_data():
    """adds some default data if the dashboard is empty (currently no-op)"""
    pass
