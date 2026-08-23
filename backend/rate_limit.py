"""
In-memory rate limiting for endpoints that spend money.

Frame analysis forwards images to a paid vision API on every call. Without
a limiter, one runaway frontend loop (or one attacker with the bearer
token) quietly becomes an OpenAI bill. Fixed-window counters keyed by
client IP, same shape as auth.py: simple, no dependencies, per-process.

ANALYZE_RATE_LIMIT_PER_MINUTE=0 disables limiting entirely.
"""

import os
import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

RATE_LIMITED_PATHS = ("/api/frames/analyze",)
WINDOW_SECONDS = 60


def get_analyze_rate_limit() -> int:
    try:
        return max(0, int(os.getenv("ANALYZE_RATE_LIMIT_PER_MINUTE", "10")))
    except ValueError:
        return 10


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


class PaidEndpointRateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, get_limit=get_analyze_rate_limit):
        super().__init__(app)
        self._get_limit = get_limit
        self._counts: dict[str, dict] = {}

    def _check(self, key: str) -> tuple[bool, int]:
        limit = self._get_limit()
        if limit <= 0:
            return True, 0

        now = time.monotonic()

        # Bound memory like everything else that keys on untrusted input.
        if len(self._counts) > 5_000:
            self._counts = {
                k: v
                for k, v in self._counts.items()
                if now - v["window_start"] < WINDOW_SECONDS
            }

        entry = self._counts.get(key)
        if not entry or now - entry["window_start"] >= WINDOW_SECONDS:
            self._counts[key] = {"window_start": now, "count": 1}
            return True, 0

        if entry["count"] < limit:
            entry["count"] += 1
            return True, 0

        retry_after = int(WINDOW_SECONDS - (now - entry["window_start"])) + 1
        return False, max(1, retry_after)

    async def dispatch(self, request: Request, call_next):
        # startswith so both /analyze and /analyze/async are covered.
        if request.method == "POST" and request.url.path.startswith(RATE_LIMITED_PATHS):
            key = _client_ip(request)
            allowed, retry_after = self._check(f"{key}:{request.url.path}")
            if not allowed:
                return JSONResponse(
                    status_code=429,
                    content={"error": "Too many analysis requests. Slow down."},
                    headers={"Retry-After": str(retry_after)},
                )
        return await call_next(request)
