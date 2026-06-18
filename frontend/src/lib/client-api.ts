"use client";

function readCookie(name: string) {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1];
}

export async function secureFetch(path: string, init: RequestInit = {}) {
  let token = readCookie("gclb_csrf");
  if (!token) {
    const response = await fetch(new URL("/api/security/csrf", window.location.origin));
    const data = await readJson(response);
    token = data.token;
  }

  const headers = new Headers(init.headers);
  headers.set("x-csrf-token", decodeURIComponent(token ?? ""));
  if (!(init.body instanceof FormData) && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(new URL(path, window.location.origin), { ...init, headers });
  const data = await readJson(response);
  if (!response.ok) {
    const err = new Error(data.error ?? response.statusText) as Error & { issues?: Array<{ path: string[]; message: string }> };
    if (Array.isArray(data.issues)) err.issues = data.issues;
    throw err;
  }

  return data;
}

async function readJson(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const text = await response.text().catch(() => "");
    console.error("[client-api] expected JSON response", {
      status: response.status,
      url: response.url,
      preview: text.slice(0, 160)
    });
    throw new Error("Request could not be completed. Please try again or contact support.");
  }
  return response.json();
}
