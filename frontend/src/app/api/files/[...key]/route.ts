import { readFile } from "node:fs/promises";
import path from "node:path";
import { handleApi } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Minimal content-type resolver (avoids shipping a mime dependency).
function contentTypeFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
    ".svg": "image/svg+xml"
  };
  return map[ext] ?? "application/octet-stream";
}

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

    const uploadsRoot = path.resolve(process.cwd(), "uploads");
    const filePath = path.resolve(uploadsRoot, ...key);

    // Ensure the resolved path stays inside the uploads directory.
    if (filePath !== uploadsRoot && !filePath.startsWith(uploadsRoot + path.sep)) {
      throw new Response("Invalid file path.", { status: 400 });
    }

    // Build the URL representation used in the DB (relative to uploads root).
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

    let data: Buffer;
    try {
      data = await readFile(filePath);
    } catch {
      throw new Response("File not found.", { status: 404 });
    }

    const url = new URL(request.url);
    const isDownload = url.searchParams.has("dl");

    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": contentTypeFor(filePath),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": isDownload ? `attachment; filename="${key[key.length - 1]}"` : "inline"
      }
    });
  });
}
