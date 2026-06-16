"""
Transparent reverse proxy for the Next.js app.

The Kubernetes ingress routes /api/* to port 8001 (this service) and all
other paths to port 3000 (Next.js). We forward every incoming request to
the local Next.js server so that Next.js API routes work end-to-end.
"""
from __future__ import annotations

import os
import httpx
from fastapi import FastAPI, Request, Response
from starlette.background import BackgroundTask

UPSTREAM = os.environ.get("NEXTJS_UPSTREAM", "http://127.0.0.1:3000")

app = FastAPI()
client = httpx.AsyncClient(base_url=UPSTREAM, timeout=httpx.Timeout(60.0), follow_redirects=False)


HOP_BY_HOP = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
    "host",
    "content-length",
    "content-encoding",
}


@app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"])
async def proxy(full_path: str, request: Request):
    url = "/" + full_path
    if request.url.query:
        url = f"{url}?{request.url.query}"

    headers = {k: v for k, v in request.headers.items() if k.lower() not in HOP_BY_HOP}
    headers["host"] = request.headers.get("host", "localhost")

    body = await request.body()

    req = client.build_request(
        method=request.method,
        url=url,
        headers=headers,
        content=body,
    )
    upstream = await client.send(req, stream=True)

    response_headers = {
        k: v for k, v in upstream.headers.items() if k.lower() not in HOP_BY_HOP
    }

    return Response(
        content=await upstream.aread(),
        status_code=upstream.status_code,
        headers=response_headers,
        background=BackgroundTask(upstream.aclose),
    )


@app.on_event("shutdown")
async def _shutdown():
    await client.aclose()
