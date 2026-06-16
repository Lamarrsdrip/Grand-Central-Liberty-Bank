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
    const response = await fetch("/api/security/csrf");
    const data = (await response.json()) as { token: string };
    token = data.token;
  }

  const headers = new Headers(init.headers);
  headers.set("x-csrf-token", decodeURIComponent(token ?? ""));
  if (!(init.body instanceof FormData) && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(path, { ...init, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error ?? response.statusText);
  }

  return data;
}
