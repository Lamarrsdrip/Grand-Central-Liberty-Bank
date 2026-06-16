import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const uploadRoot = path.join(process.cwd(), "uploads");

function s3Client() {
  if (!process.env.S3_BUCKET || !process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY) {
    return null;
  }

  return new S3Client({
    region: process.env.S3_REGION ?? "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: Boolean(process.env.S3_ENDPOINT),
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
    }
  });
}

export async function storeFile(input: { buffer: Buffer; fileName: string; contentType: string; folder: string }) {
  const safeName = input.fileName.replace(/[^a-zA-Z0-9_.-]/g, "-");
  const key = `${input.folder}/${crypto.randomUUID()}-${safeName}`;
  const client = s3Client();

  if (client && process.env.S3_BUCKET) {
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: input.buffer,
        ContentType: input.contentType
      })
    );

    return process.env.S3_ENDPOINT
      ? `${process.env.S3_ENDPOINT.replace(/\/$/, "")}/${process.env.S3_BUCKET}/${key}`
      : `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com/${key}`;
  }

  const fullPath = path.join(uploadRoot, key);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, input.buffer);

  return `/api/files/${key}`;
}
