import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi, ok } from "@/lib/api";
import { auditLog } from "@/lib/audit";
import { requireAdmin, requestIpAndAgent } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

const schema = z.object({ to: z.string().email() });

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const input = schema.parse(await request.json());
    const { ip, userAgent } = await requestIpAndAgent();

    try {
      const result = await sendEmail({
        to: input.to,
        subject: "Grand Central Liberty Bank — SMTP Test",
        html: `
          <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px">
            <h2 style="color:#22c55e">SMTP Test Successful</h2>
            <p>Your Grand Central Liberty Bank email configuration is working correctly.</p>
            <p style="color:#666;font-size:12px">This test was sent from the admin panel.</p>
          </div>
        `
      });
      await auditLog({
        actorId: admin.id,
        action: "ADMIN_SENT_TEST_EMAIL",
        entity: "EmailSetting",
        metadata: { to: input.to, skipped: result.skipped },
        ip,
        userAgent
      });
      return ok({ success: true, result, message: result.skipped ? "SMTP not configured — email was skipped." : `Test email delivered to ${input.to}` });
    } catch (error) {
      // Surface the real SMTP error to the admin instead of the generic 500 message
      const msg = error instanceof Error ? error.message : String(error);
      console.error("[email-test] SMTP failure:", msg);
      // Throw as Response so apiError puts the real message in { error: "..." }
      throw new Response(`SMTP Error: ${msg}`, { status: 422 });
    }
  });
}
