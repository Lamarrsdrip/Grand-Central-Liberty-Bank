import { put } from "@vercel/blob";

export async function storeFile(input: { buffer: Buffer; fileName: string; contentType: string; folder: string }) {
  const safeName = input.fileName.replace(/[^a-zA-Z0-9_.-]/g, "-");
  const key = `${input.folder}/${crypto.randomUUID()}-${safeName}`;

  await put(key, input.buffer, {
    access: "private",
    contentType: input.contentType,
    addRandomSuffix: false
  });

  return `/api/files/${key}`;
}
