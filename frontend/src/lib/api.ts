import { NextResponse } from "next/server";
import { apiError } from "@/lib/security";
import { safeSerialize } from "@/lib/serialize";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(safeSerialize(data), init);
}

export function created<T>(data: T) {
  return NextResponse.json(safeSerialize(data), { status: 201 });
}

export async function handleApi(handler: () => Promise<Response>) {
  try {
    return await handler();
  } catch (error) {
    return apiError(error);
  }
}
