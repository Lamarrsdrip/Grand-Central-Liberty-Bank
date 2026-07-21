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
    const result = await sendEmail({
      to: input.to,
      subject: "Grand Central Liberty Bank SMTP test",
      html: "<p>Your Grand Central Liberty Bank email configuration is working.</p>"
    });
    await auditLog({
      actorId: admin.id,
      action: "ADMIN_SENT_TEST_EMAIL",
      entity: "EmailSetting",
      metadata: { to: input.to, skipped: result.skipped },
      ip,
      userAgent
    });

    return ok({ result });
  });
}
