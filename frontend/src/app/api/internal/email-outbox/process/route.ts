import { NextRequest } from "next/server";
import { handleApi, ok } from "@/lib/api";
import { processEmailOutbox } from "@/lib/transactional-email";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleApi(async () => {
    const expected = process.env.CRON_SECRET;
    const supplied = request.headers.get("authorization");
    if (!expected || supplied !== `Bearer ${expected}`) {
      throw new Response("Unauthorized.", { status: 401 });
    }
    const results = await processEmailOutbox(25);
    return ok({ processed: results.length });
  });
}
