"""
Shared bearer-token auth for the FabOps Sentinel API.

Why this exists: every route in this app is powerful — machines can be
deleted, sessions stopped, the database wiped via /api/seed/clear, and
frame analysis triggers paid vision-API calls. With no auth, anyone who
can reach port 8000 (LAN, docker port mapping, tunnel) controls all of it.

How it behaves:
- Set FABOPS_API_TOKEN in .env to require `Authorization: Bearer <token>`
  on every /api route except /api/health.
- If no token is configured, requests from non-loopback clients are
  rejected with 503 so an accidentally exposed port is not an open API.
  Loopback stays open for local development.
"""

import os
import secrets

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

# Routes that never require auth. Health checks must work for container
# orchestrators and uptime probes that have no way to hold a token.
PUBLIC_PATHS = {"/", "/api/health"}

LOOPBACK_HOSTS = {"127.0.0.1", "::1", "localhost", "testclient"}


def get_api_token() -> str:
    """The configured token, or empty string when auth is unconfigured."""
    return os.getenv("FABOPS_API_TOKEN", "").strip()


def _is_loopback(request: Request) -> bool:
    client_host = request.client.host if request.client else ""
    return client_host in LOOPBACK_HOSTS


class BearerTokenMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        if path in PUBLIC_PATHS or not path.startswith("/api/"):
            return await call_next(request)

        token = get_api_token()
        expected = f"Bearer {token}"

        header = request.headers.get("authorization", "")
        if token and secrets.compare_digest(header, expected):
            return await call_next(request)

        if not token and _is_loopback(request):
            # Unconfigured + local dev → allow, but make the gap visible.
            request.state.auth_warning = "FABOPS_API_TOKEN not set; auth disabled"
            return await call_next(request)

        if not token:
            return JSONResponse(
                status_code=503,
                content={
                    "error": (
                        "API requires FABOPS_API_TOKEN to be set for "
                        "non-local clients. Configure it in backend/.env."
                    )
                },
            )

        return JSONResponse(
            status_code=401, content={"error": "Invalid or missing bearer token"}
        )
