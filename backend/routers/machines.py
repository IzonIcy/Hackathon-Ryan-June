"""routes for machines - cameras, printers, lasers, cncs (the hardware stuff)"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database.db import get_connection

router = APIRouter(prefix="/api/machines", tags=["machines"])


class CreateMachineRequest(BaseModel):
    """what you send when adding a new machine to the system"""

    name: str
    machine_type: str = "camera"  # default to camera cuz thats what most ppl use
    device_id: str | None = None  # like a serial number or whatever idk


@router.get("")
def list_machines():
    """returns all machines so the dashboard can show them (this is the list of machines btw)"""
    conn = get_connection()
    machines = conn.execute("SELECT * FROM machines ORDER BY name").fetchall()
    conn.close()
    return [dict(m) for m in machines]


@router.post("")
def create_machine(req: CreateMachineRequest):
    """creates a new machine (camera monitor) - welcome to the family lil guy"""
    conn = get_connection()
    cur = conn.execute(
        "INSERT INTO machines (name, machine_type, device_id) VALUES (?, ?, ?)",
        (req.name, req.machine_type, req.device_id),
    )
    conn.commit()
    machine = conn.execute(
        "SELECT * FROM machines WHERE id = ?", (cur.lastrowid,)
    ).fetchone()
    conn.close()
    return dict(machine)


@router.get("/{machine_id}")
def get_machine(machine_id: int):
    """get one machine by its id (hopefully it exists lol)"""
    conn = get_connection()
    machine = conn.execute(
        "SELECT * FROM machines WHERE id = ?", (machine_id,)
    ).fetchone()
    conn.close()
    if not machine:
        raise HTTPException(
            status_code=404, detail="machine not found (it vanished into the void)"
        )
    return dict(machine)


@router.patch("/{machine_id}/status")
def update_machine_status(machine_id: int, status: str):
    """changes the status of a machine (idle/running/paused/stopped)"""
    allowed = ["idle", "running", "paused", "stopped"]
    if status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"status has to be one of: {allowed} (bro read the docs)",
        )

    conn = get_connection()
    conn.execute("UPDATE machines SET status = ? WHERE id = ?", (status, machine_id))
    conn.commit()
    machine = conn.execute(
        "SELECT * FROM machines WHERE id = ?", (machine_id,)
    ).fetchone()
    conn.close()

    if not machine:
        raise HTTPException(
            status_code=404, detail="machine not found (where did it go fr fr)"
        )
    return dict(machine)


@router.delete("/{machine_id}")
def delete_machine(machine_id: int):
    """removes a machine monitor (rip machine 🫡)"""
    conn = get_connection()
    machine = conn.execute(
        "SELECT * FROM machines WHERE id = ?", (machine_id,)
    ).fetchone()
    if not machine:
        conn.close()
        raise HTTPException(
            status_code=404,
            detail="machine not found (cant delete what doesnt exist lol)",
        )
    conn.execute("DELETE FROM machines WHERE id = ?", (machine_id,))
    conn.commit()
    conn.close()
    return {"ok": True, "id": machine_id}
