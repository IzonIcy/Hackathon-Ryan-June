"""
yo this talks to chatgpt and asks it to look at pictures of 3d printers lol

so like, theres reference images in backend/reference_images/ that we send to the ai
so it knows what defects look like (spaghetti, warping, etc)
ngl this is the coolest part of the whole project fr fr

TODO: add more reference images or something idk
"""

import base64
import ipaddress
import json
import os
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlsplit

from dotenv import load_dotenv
from httpx import AsyncClient

# ---- Load .env as fallback (belt AND suspenders) ----
# main.py also loads .env, but this ensures vision.py always finds the key
# even when run in weird contexts or hot-reload edge cases.
_env_path = Path(__file__).parent.parent / ".env"
if _env_path.exists():
    load_dotenv(_env_path)
    print(f"[vision] loaded .env from {_env_path}")
else:
    print(f"[vision] ⚠️  .env NOT FOUND at {_env_path}")

DEFAULT_BASE_URL = "https://api.openai.com/v1"
DEFAULT_HOSTED_MODEL = "gpt-4o-mini"
DEFAULT_LOCAL_MODEL = "llava"

_LOOPBACK_NAMES = frozenset({"localhost", "localhost.localdomain", "ip6-localhost"})


@dataclass(frozen=True)
class VisionConfig:
    """Resolved provider settings. vision.py, main.py, and the eval script all
    read the endpoint from here instead of each calling getenv."""

    base_url: str
    model: str
    api_key: str | None
    is_local: bool

    @property
    def chat_completions_url(self) -> str:
        return f"{self.base_url}/chat/completions"


def _is_local_host(host: str) -> bool:
    """True when the endpoint is unreachable from outside this machine or the
    network it sits on. Covers loopback, private ranges, and single-label names
    such as the `ollama` service on a compose network."""
    normalized = host.strip("[]").lower()
    if not normalized:
        return False
    if normalized in _LOOPBACK_NAMES or normalized.endswith(".localhost"):
        return True
    if normalized.endswith(".local"):
        return True
    try:
        address = ipaddress.ip_address(normalized)
    except ValueError:
        # A name with no dot only resolves on a container network or a LAN.
        return "." not in normalized
    return address.is_loopback or address.is_unspecified or address.is_private


def _normalize_base_url(raw: str) -> str:
    candidate = raw.strip()
    parts = urlsplit(candidate)
    if not candidate or parts.scheme not in ("http", "https") or not parts.hostname:
        raise ValueError(
            f"Vision base URL {raw!r} is not a usable endpoint. Set OPENAI_BASE_URL "
            "to a full http(s) URL such as http://localhost:11434/v1."
        )
    return candidate.rstrip("/")


def resolve_vision_config(
    environ: Mapping[str, str] | None = None,
    *,
    base_url: str | None = None,
    model: str | None = None,
    api_key: str | None = None,
) -> VisionConfig:
    """Pick the effective provider. Explicit arguments beat the environment,
    which beats the defaults. A local endpoint falls back to a local model name
    because gpt-4o-mini does not exist on Ollama."""
    env = os.environ if environ is None else environ
    resolved_url = _normalize_base_url(
        base_url or env.get("OPENAI_BASE_URL") or DEFAULT_BASE_URL
    )
    is_local = _is_local_host(urlsplit(resolved_url).hostname or "")
    resolved_model = (
        model
        or env.get("OPENAI_MODEL")
        or (DEFAULT_LOCAL_MODEL if is_local else DEFAULT_HOSTED_MODEL)
    ).strip()
    if not resolved_model:
        raise ValueError(
            "Vision model name is empty. Set OPENAI_MODEL to a model the "
            "endpoint serves, such as 'llava' or 'gpt-4o-mini'."
        )
    return VisionConfig(
        base_url=resolved_url,
        model=resolved_model,
        api_key=api_key or env.get("OPENAI_API_KEY") or None,
        is_local=is_local,
    )


CONFIG = resolve_vision_config()

API_KEY = CONFIG.api_key
if API_KEY:
    print(f"[vision] OPENAI_API_KEY found ({len(API_KEY)} chars)")
elif CONFIG.is_local:
    print("[vision] OPENAI_API_KEY unset, local endpoint so no key is needed")
else:
    print("[vision] ⚠️  OPENAI_API_KEY is NOT SET, hosted analysis will fail!")

API_BASE_URL = CONFIG.base_url
API_URL = CONFIG.chat_completions_url
MODEL = CONFIG.model
print(f"[vision] endpoint {API_URL} model {MODEL}")

# load reference images at startup (this took me like 4 tries omg)
REF_GOOD = []
REF_DEFECT = []

ref_dir = Path(__file__).parent.parent / "reference_images"
if ref_dir.exists():
    for f in sorted(ref_dir.iterdir()):
        if f.suffix.lower() not in (".jpg", ".jpeg", ".png"):
            continue
        try:
            data = base64.b64encode(f.read_bytes()).decode("ascii")
            name = f.name.lower()
            if "error" in name or "spagheti" in name:
                REF_DEFECT.append(data)
            else:
                REF_GOOD.append(data)
        except OSError as e:
            print(f"[vision] ⚠️  skipping unreadable reference image {f.name}: {e}")
    print(
        f"[vision] loaded {len(REF_GOOD)} good + {len(REF_DEFECT)} defect reference images (we got refs fr fr)"
    )

# different prompts for different machines (lowkey the 3d printer one is the best)
# TODO: add prompts for other machines maybe? like a plotter? idk
PROMPTS = {
    "3d_printer": """
You are watching a 3D printer (no cap). Look at the print bed and nozzle area.
Compare the live image against the reference images above.

NORMAL: print is sticking to bed, layers look clean and even, good first layer adhesion.

WARNING - minor issues (kinda sus but not terrible):
- STRINGING: thin plastic strings/hairs between walls or on the print surface (looks like spiderwebs)
- WARPING: corners of the print lifting slightly off the bed (it's curling up like my toast)
- LAYER SHIFTING: layers slightly misaligned, rough surface texture
- BLOBBING: small blobs/zits on the surface (like acne but for printers lol)
- CRACKING: small cracks or delamination between layers

STOP - major failure (BRO SOMETHING IS ON FIRE):
- SPAGHETTI: extruder printing in mid-air with tangled plastic strings everywhere (yeet)
- OFF PLATFORM: print detached entirely from the bed and is being dragged around
- MAJOR LAYER SHIFT: layers shifted significantly, print is ruined (rip)
- NOZZLE CRASH: nozzle digging into the print (aggressive behavior fr fr)
""",
    "laser_cutter": """
You are watching a laser cutter. Look at the cutting area through the enclosure.
- NORMAL: clean cut, minimal smoke, material is correct
- WARNING: more smoke than usual, material starting to char too much, small flame (its alittle warm)
- STOP: large flame, lots of smoke, material on fire, wrong material (CALL THE FIRE DEPT)
""",
    "cnc": """
You are watching a CNC router or mill. Look at the cutting area and workpiece.
- NORMAL: clean cuts, workpiece is secure, chips are clearing
- WARNING: workpiece shifting, tool making rough noise (chatter), chips building up (thats not good lol)
- STOP: workpiece came loose, tool broken, zero position lost, crash (she's done for)
""",
}


async def analyze_image(machine_type, image_base64, api_key=None, config=None):
    """
    sends the image to the configured vision model and gets back what it thinks
    (fingers crossed it works lol)
    """
    cfg = config or CONFIG
    key = api_key or cfg.api_key
    if not key and not cfg.is_local:
        return {
            "status": "unknown",
            "confidence": 0.0,
            "observation": "No API key found. Copy backend/.env.example to backend/.env and fill in your OPENAI_API_KEY, or point OPENAI_BASE_URL at a local endpoint.",
            "probable_cause": "OPENAI_API_KEY environment variable is missing or empty",
            "recommended_action": "Run 'cp .env.example .env' (Mac/Linux) or 'copy .env.example .env' (Windows) in the backend/ folder, then edit .env with your API key. Then restart the server.",
            "severity": "low",
        }

    prompt = PROMPTS.get(machine_type, PROMPTS["3d_printer"])

    system_prompt = f"""{prompt}

You MUST respond with ONLY valid JSON like this:
{{
    "status": "normal",
    "confidence": 0.95,
    "observation": "Print looks clean, good first layer adhesion",
    "probable_cause": null,
    "recommended_action": "No action needed, job is running fine",
    "severity": "low"
}}

Status can be: normal, warning, stop
Severity can be: low, medium, high
"""

    # build the message with reference images if we have them
    # (values are str OR nested dicts for image parts, hence the object value type)
    content: list[dict[str, object]] = [{"type": "text", "text": system_prompt}]

    if REF_GOOD:
        content.append({"type": "text", "text": "Reference images of GOOD prints:"})
        for img in REF_GOOD:
            content.append(
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{img}",
                        "detail": "low",
                    },
                }
            )

    if REF_DEFECT:
        content.append(
            {"type": "text", "text": "Reference images of DEFECTS (spaghetti/error):"}
        )
        for img in REF_DEFECT:
            content.append(
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{img}",
                        "detail": "low",
                    },
                }
            )

    if REF_GOOD or REF_DEFECT:
        content.append({"type": "text", "text": "Now analyze THIS live camera frame:"})

    content.append(
        {
            "type": "image_url",
            "image_url": {
                "url": f"data:image/jpeg;base64,{image_base64}",
                "detail": "low",
            },
        }
    )

    # Ollama ignores the bearer token but still accepts the header, so only send
    # it when we actually have one.
    headers = {"Content-Type": "application/json"}
    if key:
        headers["Authorization"] = f"Bearer {key}"

    try:
        async with AsyncClient(timeout=30) as client:
            response = await client.post(
                cfg.chat_completions_url,
                headers=headers,
                json={
                    "model": cfg.model,
                    "messages": [{"role": "user", "content": content}],
                    "max_tokens": 300,
                    "temperature": 0.3,
                },
            )
            response.raise_for_status()
            data = response.json()
            raw_content = data["choices"][0]["message"]["content"]

            try:
                result = json.loads(raw_content)
            except json.JSONDecodeError:
                if "```" in raw_content:
                    parts = raw_content.split("```")
                    json_part = parts[1]
                    if json_part.startswith("json"):
                        json_part = json_part[4:]
                    result = json.loads(json_part)
                else:
                    print("couldnt parse ai response:", raw_content)
                    raise

            return {
                "status": result.get("status", "unknown"),
                "confidence": result.get("confidence", 0.0),
                "observation": result.get("observation", ""),
                "probable_cause": result.get("probable_cause"),
                "recommended_action": result.get("recommended_action", ""),
                "severity": result.get("severity", "low"),
            }

    except Exception as e:
        print(f"ai analysis failed (bro what did u do): {e}")
        return {
            "status": "unknown",
            "confidence": 0.0,
            "observation": f"AI analysis failed: {str(e)} (ngl this is kinda embarrasing)",
            "probable_cause": None,
            "recommended_action": "Check your API key and internet. Or yell at the printer idk.",
            "severity": "low",
        }
