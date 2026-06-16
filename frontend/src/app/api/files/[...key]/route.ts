import { readFile } from "node:fs/promises";
import path from "node:path";
import { handleApi } from "@/lib/api";
import { requireUser } from "@/lib/auth";

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

export async function GET(_request: Request, context: { params: Promise<{ key: string[] }> }) {
  return handleApi(async () => {
    // Require an authenticated session before serving any uploaded file.
    // KYC documents, IDs, and selfies must never be publicly reachable.
    await requireUser();

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

    let data: Buffer;
    try {
      data = await readFile(filePath);
    } catch {
      throw new Response("File not found.", { status: 404 });
    }

    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": contentTypeFor(filePath),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline"
      }
    });
  });
}
