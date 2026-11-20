# Capturing the FabOps demo

The demo shot is the Next.js dashboard showing a monitor, a recent verdict, and
one incident row. It needs the backend and the dashboard running at the same
time, which is why it is not captured here: this repo's program does not start
servers without asking first.

## Why there is no capture yet

The dashboard reads live state from the FastAPI backend. A static build renders
empty cards and a disconnected banner, which is worse than no screenshot. The
capture needs two processes:

- `uvicorn main:app --port 8000` in `backend/`
- the dashboard on port 3000

Docker is not installed on the capture machine, so `docker compose up` is not an
option there.

## Steps

1. Copy the environment template and fill it:

   ```sh
   cp backend/.env.example backend/.env
   ```

   `OPENAI_API_KEY` is required for analysis. Twilio keys are optional and the
   SMS path disables itself when they are absent.

2. Start the backend from `backend/` in a Python 3.12+ environment:

   ```sh
   pip install -r requirements.txt
   uvicorn main:app --port 8000
   ```

3. Start the dashboard from `dashboard/`:

   ```sh
   bun install && bun run dev
   ```

4. Open `http://localhost:3000`, start a monitor against one of the reference
   images in `backend/reference_images/`, and let one frame analyze so the card
   shows a real verdict rather than an empty state.

5. Capture the page at 1440x600. Position the browser window at y=240 first so a
   system dialog cannot land in frame, then capture the region below the browser
   toolbar:

   ```sh
   screencapture -x -R 0,400,1440,600 docs/images/demo.png
   ```

## The video

The screenshot shows one moment. The video shows the loop, which is what the project is: a camera watches a machine, a frame gets read, and a verdict shows up in the dashboard without anyone typing.

This take needs a working vision endpoint. Without one the analysis step produces nothing and the video is a person clicking buttons, so record it on a machine where `OPENAI_BASE_URL` points at a server you can query. Check that first:

```sh
curl -s http://localhost:11434/v1/models | head -c 200
```

Then run the same two processes from the steps above, with the backend pointed at that endpoint, and record this:

1. **0:00** The dashboard at `http://localhost:3000` with the machine list visible. Two machines already added, one of them a 3D printer.
2. **0:08** Add a machine. Pick "3D printer", give it a name, save. It appears in the list.
3. **0:18** Click into that machine and press **Watch It**. The session goes active and the page starts showing frames.
4. **0:30** Let a frame analyze. The verdict card fills in and, if the frame reads as a defect, an incident appears in the feed. Do not click **Analyze Now** here; the point is that it happened on its own.
5. **0:42** Navigate to `/incidents` and show the row for the incident that just landed.
6. **0:52** Navigate to `/analytics` and hold on the charts. The incident from this take is in the counts.

Stop the capture after the hold. If the verdict card stays empty at 0:40, the endpoint is not answering and the take is dead.

### Recording and checking it

**Do not pass `-V`.** `screencapture -V <seconds>` is what produced the frozen tail described above: the file reports its full length while the last stretch repeats one frame. Start the recording with no duration limit and stop it with `kill -INT` instead.

`ffmpeg` is not installed on the machine these were written on. [LumiComp's docs/demo.md](https://github.com/IzonIcy/LumiComp/blob/main/docs/demo.md) carries Swift replacements for both jobs, frame extraction and trimming, which work anywhere a Swift toolchain does.

Record the browser window rather than the screen, so no other tab can end up in the file. Save this as `/tmp/winid.swift` to look the id up:

```swift
import CoreGraphics
import Foundation
let needle = CommandLine.arguments[1]
let list = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] ?? []
for w in list where (w[kCGWindowOwnerName as String] as? String ?? "").contains(needle) {
    print(w[kCGWindowNumber as String] as? Int ?? 0)
}
```

```sh
swift /tmp/winid.swift Safari
screencapture -v -l"$(swift /tmp/winid.swift Safari | head -1)" demo.mov
```

The file's duration says nothing about whether its frames are live. Pull frames and look at them:

```sh
for t in 5 12 22 34 46 54; do
    swift /tmp/frame.swift demo.mov "frame-$t.png" "$t"
done
```

The frame at 34 seconds must show a filled verdict card, and the last one must show the analytics charts. A repeated tail means the capture froze.

```sh
swift /tmp/clip.swift demo.mov demo.mp4 0 56
```

Upload it through the GitHub issue composer and paste the `user-attachments` URL on its own line under "How it works".

## What the repo carries now

`docs/images/demo.png` is a real capture of the dashboard served by `next start`
against a seeded demo session, cropped to the page so no browser chrome shows.
The feed reads "everything fine" because the seeded frames were never analyzed:
that needs a working vision endpoint. Re-run the steps above with a key to
replace it with a shot that carries a real verdict.

The capture command used:

```sh
screencapture -x -R 0,400,1440,600 docs/images/demo.png
```
