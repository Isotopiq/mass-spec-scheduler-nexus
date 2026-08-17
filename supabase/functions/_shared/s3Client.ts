// Shared SigV4-signed S3 helper for any S3-compatible server (MinIO, Ceph, Wasabi, etc.)
// Uses the lightweight aws4fetch library — no AWS SDK required.
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";

export interface S3Config {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
}

export function loadS3Config(): S3Config {
  const endpoint = Deno.env.get("S3_ENDPOINT");
  const region = Deno.env.get("S3_REGION") || "us-east-1";
  const bucket = Deno.env.get("S3_BUCKET");
  const accessKeyId = Deno.env.get("S3_ACCESS_KEY_ID");
  const secretAccessKey = Deno.env.get("S3_SECRET_ACCESS_KEY");
  const forcePathStyle = (Deno.env.get("S3_FORCE_PATH_STYLE") || "true").toLowerCase() === "true";

  const missing: string[] = [];
  if (!endpoint) missing.push("S3_ENDPOINT");
  if (!bucket) missing.push("S3_BUCKET");
  if (!accessKeyId) missing.push("S3_ACCESS_KEY_ID");
  if (!secretAccessKey) missing.push("S3_SECRET_ACCESS_KEY");
  if (missing.length) {
    throw new Error(`Missing S3 secrets: ${missing.join(", ")}`);
  }

  // Auto-prefix scheme if missing (e.g. user stored "host.com" instead of "https://host.com")
  let normalizedEndpoint = endpoint!.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(normalizedEndpoint)) {
    normalizedEndpoint = `https://${normalizedEndpoint}`;
  }

  return {
    endpoint: normalizedEndpoint,
    region,
    bucket: bucket!,
    accessKeyId: accessKeyId!,
    secretAccessKey: secretAccessKey!,
    forcePathStyle,
  };
}

export function getS3Client(cfg: S3Config) {
  return new AwsClient({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    region: cfg.region,
    service: "s3",
  });
}

export function buildObjectUrl(cfg: S3Config, key: string): string {
  const safeKey = key.split("/").map(encodeURIComponent).join("/");
  if (cfg.forcePathStyle) {
    return `${cfg.endpoint}/${cfg.bucket}/${safeKey}`;
  }
  // virtual-hosted style — only works if endpoint is e.g. https://s3.example.com
  const url = new URL(cfg.endpoint);
  return `${url.protocol}//${cfg.bucket}.${url.host}/${safeKey}`;
}

export function buildBucketUrl(cfg: S3Config): string {
  if (cfg.forcePathStyle) {
    return `${cfg.endpoint}/${cfg.bucket}`;
  }
  const url = new URL(cfg.endpoint);
  return `${url.protocol}//${cfg.bucket}.${url.host}`;
}
