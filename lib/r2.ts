import "server-only";
import { AwsClient } from "aws4fetch";

// Cloudflare R2 over its S3-compatible API. The bucket stays private: browsers
// upload and download with short-lived presigned URLs, never through our server.

function config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return {
    client: new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" }),
    endpoint: `https://${accountId}.r2.cloudflarestorage.com/${bucket}`,
  };
}

let cached: ReturnType<typeof config> | undefined;
function r2() {
  cached ??= config();
  if (!cached) {
    throw new Error(
      "R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET.",
    );
  }
  return cached;
}

export function r2Configured() {
  cached ??= config();
  return cached !== null;
}

function objectUrl(key: string) {
  return `${r2().endpoint}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

async function presign(key: string, method: "GET" | "PUT", expiresSeconds: number, query = "") {
  const url = new URL(objectUrl(key));
  url.searchParams.set("X-Amz-Expires", String(expiresSeconds));
  if (query) for (const [k, v] of new URLSearchParams(query)) url.searchParams.set(k, v);
  const signed = await r2().client.sign(new Request(url, { method }), {
    aws: { signQuery: true },
  });
  return signed.url;
}

export function presignUpload(key: string) {
  return presign(key, "PUT", 60 * 60);
}

// With a fileName the browser saves the file; without one it can stream it in a <video>.
export function presignDownload(key: string, fileName?: string) {
  if (!fileName) return presign(key, "GET", 60 * 60);
  const disposition = `attachment; filename="${fileName.replace(/[^\w.-]/g, "_")}"`;
  return presign(
    key,
    "GET",
    60 * 60,
    `response-content-disposition=${encodeURIComponent(disposition)}`,
  );
}

export async function objectExists(key: string) {
  const res = await r2().client.fetch(objectUrl(key), { method: "HEAD" });
  return res.ok;
}

export async function deleteObject(key: string) {
  await r2().client.fetch(objectUrl(key), { method: "DELETE" });
}
