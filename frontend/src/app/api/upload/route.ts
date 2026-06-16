import { NextRequest } from "next/server";
import { created, handleApi } from "@/lib/api";
import { auditLog } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { storeFile } from "@/lib/storage";

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser();
    const form = await request.formData();
    const file = form.get("file");
    const folder = String(form.get("folder") ?? "general").replace(/[^a-zA-Z0-9-]/g, "-");
    if (!(file instanceof File)) {
      throw new Response("A file is required.", { status: 400 });
    }
    if (file.size > 8 * 1024 * 1024) {
      throw new Response("Files must be 8MB or smaller.", { status: 400 });
    }

    const url = await storeFile({
      buffer: Buffer.from(await file.arrayBuffer()),
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      folder: `${folder}/${user.id}`
    });
    await auditLog({ actorId: user.id, action: "FILE_UPLOADED", entity: "File", metadata: { url, folder } });

    return created({ url });
  });
}
