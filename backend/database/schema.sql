-- FabOps Sentinel Database Schema (looks way more complicated than it actually is lol)

CREATE TABLE IF NOT EXISTS machines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,  -- dont touch this its auto lol
    name TEXT NOT NULL,                     -- like "ender 3" or "laser boi"
    machine_type TEXT NOT NULL DEFAULT 'camera',  -- wutcha got: camera, 3d_printer, laser_cutter, cnc
    device_id TEXT,                         -- some random serial or whatever idk
    status TEXT NOT NULL DEFAULT 'idle' CHECK(status IN ('idle', 'running', 'paused', 'stopped')),  -- what dis machine doin rn
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- when we first met this machine 🥹
);

CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_id INTEGER NOT NULL,            -- wich machine is doing this (bruh why did i spell wich wrong)
    job_name TEXT NOT NULL,                 -- human readable name like "benchy boat v2"
    material TEXT,                          -- PLA, PETG, ABS, whatever
    estimated_duration INTEGER,             -- in minutes (lowkey always wrong lol)
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'running', 'paused', 'completed', 'failed')),  -- the vibes rn
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,                 -- null until we finish (like my homework lmao)
    FOREIGN KEY (machine_id) REFERENCES machines(id)
);

CREATE TABLE IF NOT EXISTS frames (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    image_path TEXT,                        -- where the pic is saved (if we keep it)
    status TEXT NOT NULL CHECK(status IN ('normal', 'warning', 'stop', 'unknown')),  -- what the AI thinks (no cap)
    confidence REAL,                        -- how sure the AI is (0.0 to 1.0)
    observation TEXT,                       -- what the AI saw (could be dumb)
    probable_cause TEXT,                    -- "bed leveling issue" or some stuff
    recommended_action TEXT,                -- what u should do about it
    severity TEXT CHECK(severity IN ('low', 'medium', 'high')),  -- how bad is it fr fr
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id)
);

CREATE TABLE IF NOT EXISTS incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    title TEXT NOT NULL,                    -- dramatic title like "PRINT FAILURE DETECTED!!!!"
    description TEXT,                       -- what actually happened
    root_cause TEXT,                        -- why it happened (probably user error lol)
    severity TEXT CHECK(severity IN ('low', 'medium', 'high')),  -- yeet or nah
    resolved INTEGER DEFAULT 0,             -- 0 = not fixed yet, 1 = we saved it
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id)
);
