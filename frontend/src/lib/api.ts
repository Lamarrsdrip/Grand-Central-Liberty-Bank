import { NextResponse } from "next/server";
import { apiError } from "@/lib/security";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

export async function handleApi(handler: () => Promise<Response>) {
  try {
    return await handler();
  } catch (error) {
    return apiError(error);
  }
}
