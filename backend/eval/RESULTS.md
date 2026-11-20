# Vision eval results

`scripts/eval_vision.py` scores the shipped vision call against the labelled frames in `backend/eval/labels.tsv`. Twelve frames, all of `backend/reference_images/`, labelled `normal` or `defect` from the filename tokens. A run sends each frame through `services.vision.analyze_image`, the same function the backend calls for a live camera frame.

## No baseline recorded

No baseline was recorded in this environment. It has no Ollama binary, no Ollama server, no OpenAI-compatible vision endpoint, no `OPENAI_API_KEY`, and no Docker. The harness refuses to print a number without a model to ask, so the table below is empty on purpose.

| Date | Endpoint | Model | Frames | Accuracy | Notes |
|---|---|---|---|---|---|
| | | | 12 | not recorded | no endpoint available in the preparing environment |

## Record a baseline

Start an endpoint, then run the harness. With Docker:

```sh
docker compose up -d ollama
docker compose exec ollama ollama pull llava
backend/.venv/bin/python scripts/eval_vision.py \
  --base-url http://localhost:11434/v1 --model llava
```

Without Docker, on a machine with the Ollama binary:

```sh
ollama serve &
ollama pull llava
backend/.venv/bin/python scripts/eval_vision.py \
  --base-url http://localhost:11434/v1 --model llava
```

Check the endpoint answers before a full run with:

```sh
backend/.venv/bin/python scripts/eval_vision.py --check \
  --base-url http://localhost:11434/v1 --model llava
```

Copy the printed `accuracy:` line into the table above with the date, endpoint, and model. One row per prompt or model change is enough to see whether a change helped.

## What the number means

- A frame counts as correct when a `normal` verdict matches a `normal` label, or when `warning` or `stop` matches a `defect` label. `unknown` always counts as wrong, so a broken endpoint cannot score.
- Severity is not scored. The filenames do not say whether a failed print is a warning or a stop, so only normal versus defect is measured.
- The frame under test is also a member of the reference set the prompt attaches, so the score describes the prompt as shipped, not a holdout. Treat small differences between two runs as noise until they repeat.
- The harness exits 1 when any frame comes back `unknown`, because a run with failed calls is not a measurement.
