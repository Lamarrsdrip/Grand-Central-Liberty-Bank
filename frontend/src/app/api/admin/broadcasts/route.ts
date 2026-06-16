import { NextRequest } from "next/server";
import { z } from "zod";
import { created, handleApi, ok } from "@/lib/api";
import { auditLog } from "@/lib/audit";
import { requireAdmin, requestIpAndAgent } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { latestKycStatus, resolveBroadcastRecipients } from "@/lib/domain";
import { sendEmail } from "@/lib/email";
import { sanitizeHtml } from "@/lib/sanitize";

const schema = z.object({
  subject: z.string().min(3),
  bodyHtml: z.string().min(3),
  target: z.enum(["ALL_USERS", "APPROVED_USERS", "KYC_PENDING_USERS", "SELECTED_USERS"]),
  selectedUserIds: z.array(z.string()).default([])
});

export async function GET() {
  return handleApi(async () => {
    await requireAdmin();
    const broadcasts = await prisma.broadcastEmail.findMany({
      orderBy: { createdAt: "desc" },
      include: { createdBy: true }
    });

    return ok({ broadcasts });
  });
}

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const input = schema.parse(await request.json());
    const { ip, userAgent } = await requestIpAndAgent();
    const bodyHtml = sanitizeHtml(input.bodyHtml);
    const users = await prisma.user.findMany({
      where: { role: "USER", status: { not: "SUSPENDED" } },
      include: { kycSubmissions: { orderBy: { createdAt: "desc" } } }
    });
    const recipients = resolveBroadcastRecipients(
      users.map((user) => ({
        id: user.id,
        email: user.email,
        kycStatus: latestKycStatus(user.kycSubmissions.map((submission) => ({ status: submission.status, createdAt: submission.createdAt })))
      })),
      input.target,
      input.selectedUserIds
    );
    const broadcast = await prisma.broadcastEmail.create({
      data: {
        createdById: admin.id,
        subject: input.subject,
        bodyHtml,
        target: input.target,
        selectedUserIds: input.selectedUserIds,
        status: "SENDING"
      }
    });

    let sentCount = 0;
    let failedCount = 0;
    for (const recipient of recipients) {
      try {
        const result = await sendEmail({ to: recipient, subject: input.subject, html: bodyHtml });
        if (result.skipped) {
          failedCount += 1;
        } else {
          sentCount += 1;
        }
      } catch {
        failedCount += 1;
      }
    }

    const updated = await prisma.broadcastEmail.update({
      where: { id: broadcast.id },
      data: {
        status: failedCount > 0 && sentCount === 0 ? "FAILED" : "SENT",
        sentCount,
        failedCount
      }
    });
    await auditLog({
      actorId: admin.id,
      action: "ADMIN_SENT_BROADCAST",
      entity: "BroadcastEmail",
      entityId: broadcast.id,
      metadata: { target: input.target, recipients: recipients.length, sentCount, failedCount },
      ip,
      userAgent
    });

    return created({ broadcast: updated });
  });
}
