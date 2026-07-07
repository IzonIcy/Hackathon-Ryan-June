"""talks to gpt-4 and asks it to look at pictures of machines

theres reference images in backend/reference_images/ that we send to the ai
so it knows what defects look like (spaghetti, warping, etc)
"""

import os
import json
import base64
from pathlib import Path
from httpx import AsyncClient

API_KEY = os.getenv("OPENAI_API_KEY")
API_URL = "https://api.openai.com/v1/chat/completions"

# load reference images at startup
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
        except:
            pass
    print(
        f"[vision] loaded {len(REF_GOOD)} good + {len(REF_DEFECT)} defect reference images"
    )

# different prompts for different machines
PROMPTS = {
    "3d_printer": """
You are watching a 3D printer. Look at the print bed and nozzle area.
Compare the live image against the reference images above.

NORMAL: print is sticking to bed, layers look clean and even, good first layer adhesion.

WARNING - minor issues:
- STRINGING: thin plastic strings/hairs between walls or on the print surface
- WARPING: corners of the print lifting slightly off the bed
- LAYER SHIFTING: layers slightly misaligned, rough surface texture
- BLOBBING: small blobs/zits on the surface
- CRACKING: small cracks or delamination between layers

STOP - major failure:
- SPAGHETTI: extruder printing in mid-air with tangled plastic strings everywhere
- OFF PLATFORM: print detached entirely from the bed and is being dragged around
- MAJOR LAYER SHIFT: layers shifted significantly, print is ruined
- NOZZLE CRASH: nozzle digging into the print
""",
    "laser_cutter": """
You are watching a laser cutter. Look at the cutting area through the enclosure.
- NORMAL: clean cut, minimal smoke, material is correct
- WARNING: more smoke than usual, material starting to char too much, small flame
- STOP: large flame, lots of smoke, material on fire, wrong material
""",
    "cnc": """
You are watching a CNC router or mill. Look at the cutting area and workpiece.
- NORMAL: clean cuts, workpiece is secure, chips are clearing
- WARNING: workpiece shifting, tool making rough noise (chatter), chips building up
- STOP: workpiece came loose, tool broken, zero position lost, crash
""",
}


async def analyze_image(machine_type, image_base64, api_key=None):
    """sends the image to gpt-4 and gets back what it thinks"""
    key = api_key or API_KEY
    if not key:
        return {
            "status": "unknown",
            "confidence": 0.0,
            "observation": "No API key set. Set the OPENAI_API_KEY env variable.",
            "probable_cause": None,
            "recommended_action": "Set up your OpenAI API key and restart.",
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
    content = [{"type": "text", "text": system_prompt}]

    if REF_GOOD:
        content.append({"type": "text", "text": "Reference image of a GOOD print:"})
        content.append(
            {
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/jpeg;base64,{REF_GOOD[0]}",
                    "detail": "low",
                },
            }
        )
    if REF_DEFECT:
        content.append(
            {"type": "text", "text": "Reference image of a DEFECT (spaghetti/error):"}
        )
        content.append(
            {
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/jpeg;base64,{REF_DEFECT[0]}",
                    "detail": "low",
                },
            }
        )
        if len(REF_DEFECT) > 1:
            content.append(
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{REF_DEFECT[1]}",
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

    try:
        async with AsyncClient(timeout=30) as client:
            response = await client.post(
                API_URL,
                headers={
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": [{"role": "user", "content": content}],
                    "max_tokens": 300,
                    "temperature": 0.3,
                },
            )
            response.raise_for_status()
            data = response.json()
            content = data["choices"][0]["message"]["content"]

            try:
                result = json.loads(content)
            except json.JSONDecodeError:
                if "```" in content:
                    parts = content.split("```")
                    json_part = parts[1]
                    if json_part.startswith("json"):
                        json_part = json_part[4:]
                    result = json.loads(json_part)
                else:
                    print("couldnt parse ai response:", content)
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
        print(f"ai analysis failed: {e}")
        return {
            "status": "unknown",
            "confidence": 0.0,
            "observation": f"AI analysis failed: {str(e)}",
            "probable_cause": None,
            "recommended_action": "Check your API key and internet.",
            "severity": "low",
        }
