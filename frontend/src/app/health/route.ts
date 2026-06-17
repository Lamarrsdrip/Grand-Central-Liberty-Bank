import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: "Grand Central Liberty Bank",
      timestamp: new Date().toISOString()
    },
    { status: 200 }
  );
}
