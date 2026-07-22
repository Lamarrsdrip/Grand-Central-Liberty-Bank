import { get } from "@vercel/blob";
import { handleApi } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request, context: { params: Promise<{ key: string[] }> }) {
  return handleApi(async () => {
    // Require an authenticated session before serving any uploaded file.
    // KYC documents, IDs, and selfies must never be publicly reachable.
    const user = await requireUser();

    const { key } = await context.params;

    // Reject any traversal attempt or empty segments.
    if (!key.length || key.some((segment) => !segment || segment.includes("..") || segment.includes("/") || segment.includes("\\"))) {
      throw new Response("Invalid file path.", { status: 400 });
    }

    // The blob's pathname (its storage key) is just the key segments rejoined.
    const blobPathname = key.join("/");

    // Build the URL representation used in the DB.
    // Stored URLs may be absolute paths like /api/files/kyc/... or just the key segments.
    const relPath = "/" + key.join("/");
    const apiFilePath = `/api/files/${key.join("/")}`;

    // Admins can access any file without restriction.
    if (user.role !== "ADMIN") {
      // For regular users: check ownership via KYC submission or card application.
      const url = new URL(request.url);
      const dl = url.searchParams.has("dl");
      void dl; // intentionally unused here

      // Check KYC submissions belonging to this user.
      const kycMatch = await prisma.kycSubmission.findFirst({
        where: {
          userId: user.id,
          OR: [
            { documentUrl: relPath },
            { documentUrl: apiFilePath },
            { documentUrl: key.join("/") },
            { selfieUrl: relPath },
            { selfieUrl: apiFilePath },
            { selfieUrl: key.join("/") }
          ]
        },
        select: { id: true }
      });

      if (!kycMatch) {
        // Check card applications belonging to this user.
        const cardMatch = await prisma.cardApplication.findFirst({
          where: {
            userId: user.id,
            OR: [
              { governmentIdUrl: relPath },
              { governmentIdUrl: apiFilePath },
              { governmentIdUrl: key.join("/") }
            ]
          },
          select: { id: true }
        });

        if (!cardMatch) {
          throw new Response("Forbidden", { status: 403 });
        }
      }
    }

    const result = await get(blobPathname, { access: "private" });
    if (!result || result.statusCode !== 200) {
      throw new Response("File not found.", { status: 404 });
    }

    const url = new URL(request.url);
    const isDownload = url.searchParams.has("dl");

    return new Response(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": isDownload ? `attachment; filename="${key[key.length - 1]}"` : "inline"
      }
    });
  });
}
