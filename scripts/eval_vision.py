#!/usr/bin/env python3
"""Score the vision prompt against the labelled reference frames.

Every frame goes through the same services.vision.analyze_image call the
backend makes for a live camera frame, so the score covers the prompt, the
reference images, and the model together. The verdict is compared with
backend/eval/labels.tsv.

    backend/.venv/bin/python scripts/eval_vision.py --check
    backend/.venv/bin/python scripts/eval_vision.py

Exits 2 with a single line when no endpoint answers, and 1 when any frame came
back unknown, because a run with failures is not a measurement.

Frames are also members of the reference set that the prompt attaches, so the
score describes the prompt as shipped rather than a holdout.
"""

import argparse
import asyncio
import base64
import contextlib
import io
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = REPO_ROOT / "backend"
DEFAULT_LABELS = BACKEND_DIR / "eval" / "labels.tsv"
DEFAULT_IMAGES = BACKEND_DIR / "reference_images"

DEFECT_STATUSES = frozenset({"warning", "stop"})
VALID_LABELS = frozenset({"normal", "defect"})
EXIT_UNREACHABLE = 2


def parse_args(argv):
    parser = argparse.ArgumentParser(
        prog="eval_vision.py",
        description=(
            "Run the labelled frames through the backend's vision call and "
            "print per-frame results plus overall accuracy."
        ),
        epilog=(
            "Frames are also members of the reference set the prompt attaches, "
            "so the score measures the prompt as shipped, not a holdout."
        ),
    )
    parser.add_argument(
        "--labels",
        type=Path,
        default=DEFAULT_LABELS,
        help=f"labels file (default: {DEFAULT_LABELS.relative_to(REPO_ROOT)})",
    )
    parser.add_argument(
        "--images",
        type=Path,
        default=DEFAULT_IMAGES,
        help=f"frame directory (default: {DEFAULT_IMAGES.relative_to(REPO_ROOT)})",
    )
    parser.add_argument(
        "--base-url",
        default=None,
        help="override OPENAI_BASE_URL, e.g. http://localhost:11434/v1",
    )
    parser.add_argument(
        "--model", default=None, help="override OPENAI_MODEL, e.g. llava"
    )
    parser.add_argument(
        "--machine-type",
        default="3d_printer",
        help="prompt to use (default: 3d_printer)",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="only verify the endpoint answers, then exit",
    )
    return parser.parse_args(argv)


def load_labels(path):
    """Read frame<TAB>label rows, skipping blanks and # comments."""
    rows = []
    for number, line in enumerate(path.read_text().splitlines(), start=1):
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if line.split("\t")[0] == "frame":
            continue
        parts = line.split("\t")
        if len(parts) != 2:
            raise ValueError(f"{path.name}:{number}: expected frame<TAB>label")
        frame, label = parts[0].strip(), parts[1].strip()
        if label not in VALID_LABELS:
            raise ValueError(
                f"{path.name}:{number}: label {label!r} is not normal or defect"
            )
        rows.append((frame, label))
    return rows


def predicted_label(status):
    """Collapse the three-valued verdict into the two labels we score against.
    An unrecognised status stays unknown instead of passing as normal."""
    if status in DEFECT_STATUSES:
        return "defect"
    if status == "normal":
        return "normal"
    return "unknown"


def probe(base_url):
    """Return (reachable, detail). Any HTTP answer counts as reachable; only a
    connection failure means nothing is listening."""
    import httpx

    try:
        response = httpx.get(f"{base_url}/models", timeout=5.0)
    except Exception as exc:  # noqa: BLE001 - the detail is the whole message
        return False, f"{type(exc).__name__}: {exc}"
    return True, f"HTTP {response.status_code}"


def confidence_text(value):
    try:
        return f"{float(value):.2f}"
    except (TypeError, ValueError):
        return "n/a"


async def score_frames(rows, images, config, machine_type):
    from services.vision import analyze_image

    results = []
    for frame, label in rows:
        payload = base64.b64encode((images / frame).read_bytes()).decode("ascii")
        verdict = await analyze_image(machine_type, payload, config=config)
        results.append((frame, label, verdict))
    return results


def print_results(results):
    columns = ("frame", "label", "verdict", "status", "conf", "result")
    table = []
    for frame, label, verdict in results:
        status = str(verdict.get("status", "unknown"))
        predicted = predicted_label(status)
        ok = predicted == label and status != "unknown"
        table.append(
            (
                frame,
                label,
                predicted,
                status,
                confidence_text(verdict.get("confidence")),
                "ok" if ok else "MISS",
            )
        )

    widths = [max(len(columns[i]), *(len(row[i]) for row in table)) for i in range(6)]
    line = "  ".join(columns[i].ljust(widths[i]) for i in range(6))
    print(line)
    print("  ".join("-" * width for width in widths))
    for row in table:
        print("  ".join(row[i].ljust(widths[i]) for i in range(6)))

    hits = sum(1 for row in table if row[5] == "ok")
    total = len(table)
    print()
    for label in ("normal", "defect"):
        for_label = [row for row in table if row[1] == label]
        if not for_label:
            continue
        correct = sum(1 for row in for_label if row[5] == "ok")
        print(f"{label}: {correct}/{len(for_label)}")
    percent = 100.0 * hits / total if total else 0.0
    print(f"accuracy: {hits}/{total} ({percent:.1f}%)")

    misses = [row for row in table if row[5] == "MISS"]
    if misses:
        print()
        print("misses:")
        for frame, label, _, status, _, _ in misses:
            print(f"  {frame}: labelled {label}, model said {status}")

    observations = [
        (frame, str(verdict.get("observation", "")).strip())
        for (frame, label, verdict), row in zip(results, table)
        if row[5] == "MISS" and str(verdict.get("observation", "")).strip()
    ]
    if observations:
        print()
        for frame, observation in observations:
            print(f"  {frame} said: {observation}")

    return total, sum(1 for row in table if row[3] == "unknown")


def main(argv=None):
    args = parse_args(argv)

    sys.path.insert(0, str(BACKEND_DIR))
    try:
        # vision.py logs its resolved config on import; a scorecard reads
        # better without it, and the run prints the same values itself.
        with contextlib.redirect_stdout(io.StringIO()):
            from services.vision import resolve_vision_config
    except Exception as exc:  # noqa: BLE001 - surface import failures as a line
        print(f"could not load the backend vision module: {exc}", file=sys.stderr)
        return EXIT_UNREACHABLE

    try:
        config = resolve_vision_config(base_url=args.base_url, model=args.model)
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        return EXIT_UNREACHABLE

    reachable, detail = probe(config.base_url)
    if not reachable:
        print(
            f"no vision endpoint at {config.base_url} ({detail}). Start one and "
            "pull the model, or pass --base-url.",
            file=sys.stderr,
        )
        return EXIT_UNREACHABLE
    if args.check:
        print(f"endpoint {config.base_url} answered ({detail})")
        print(f"model {config.model}")
        return 0

    try:
        rows = load_labels(args.labels)
    except (OSError, ValueError) as exc:
        print(f"could not read labels: {exc}", file=sys.stderr)
        return EXIT_UNREACHABLE

    if not rows:
        print(f"no labelled frames in {args.labels}", file=sys.stderr)
        return EXIT_UNREACHABLE

    missing = [frame for frame, _ in rows if not (args.images / frame).is_file()]
    if missing:
        print(
            f"{len(missing)} labelled frame(s) missing from {args.images}: "
            + ", ".join(missing),
            file=sys.stderr,
        )
        return EXIT_UNREACHABLE

    print(f"endpoint {config.base_url}, model {config.model}, {len(rows)} frames")
    print()
    results = asyncio.run(score_frames(rows, args.images, config, args.machine_type))
    total, unknowns = print_results(results)

    if unknowns:
        print()
        print(
            f"{unknowns}/{total} frames failed to analyze, so this run is not a "
            "measurement.",
            file=sys.stderr,
        )
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
