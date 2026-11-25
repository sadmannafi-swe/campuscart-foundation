import { v2 as cloudinary } from "cloudinary";
import type { UploadKind, UploadSignature } from "../../shared/types";
import { badRequest } from "./http";

interface CloudConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

/** CLOUDINARY_URL=cloudinary://KEY:SECRET@CLOUD, or the three separate variables. */
export function getCloudinaryConfig(): CloudConfig | null {
  const url = process.env["CLOUDINARY_URL"];
  if (url) {
    const m = /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/.exec(url.trim());
    if (m) return { apiKey: m[1]!, apiSecret: m[2]!, cloudName: m[3]! };
  }
  const cloudName = process.env["CLOUDINARY_CLOUD_NAME"];
  const apiKey = process.env["CLOUDINARY_API_KEY"];
  const apiSecret = process.env["CLOUDINARY_API_SECRET"];
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

function requireConfig(): CloudConfig {
  const c = getCloudinaryConfig();
  if (!c) throw badRequest("Image uploads are not configured yet");
  cloudinary.config({
    cloud_name: c.cloudName,
    api_key: c.apiKey,
    api_secret: c.apiSecret,
    secure: true,
  });
  return c;
}

/** Student ID photos and profile photos are private ("authenticated" delivery). */
export const isPrivateKind = (kind: UploadKind) => kind === "student-id" || kind === "avatar";

export const uploadFolder = (kind: UploadKind, userId: string) => `campuscart/${kind}/${userId}`;

/** Signature for a direct browser → Cloudinary upload into the user's own folder. */
export function signUpload(kind: UploadKind, userId: string): UploadSignature {
  const c = requireConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = uploadFolder(kind, userId);
  const type = isPrivateKind(kind) ? "authenticated" : "upload";
  const params: Record<string, string | number> = { folder, timestamp };
  if (type === "authenticated") params["type"] = type;
  const signature = cloudinary.utils.api_sign_request(params, c.apiSecret);
  return { cloudName: c.cloudName, apiKey: c.apiKey, timestamp, signature, folder, type };
}

/** Accept only public delivery URLs from our cloud, inside the user's folder for that kind. */
export function assertOwnImageUrl(
  url: string,
  kind: "product" | "store-logo" | "preowned" | "basha" | "event",
  userId: string,
): string {
  const c = getCloudinaryConfig();
  const prefix = c ? `https://res.cloudinary.com/${c.cloudName}/image/upload/` : null;
  const folder = uploadFolder(kind, userId);
  if (
    !prefix ||
    !url.startsWith(prefix) ||
    !url.includes(`/${folder}/`) ||
    url.includes("..") ||
    /[?#\s]/.test(url) ||
    url.length > 500
  ) {
    throw badRequest("Invalid image");
  }
  return url;
}

/** Validate a private public_id lives in the user's own folder for that kind. */
export function assertOwnPrivateId(
  publicId: string,
  userId: string,
  kind: "student-id" | "avatar" = "student-id",
): string {
  const folder = uploadFolder(kind, userId);
  if (
    !publicId.startsWith(`${folder}/`) ||
    publicId.includes("..") ||
    publicId.length > 300 ||
    /[^\w\-/.]/.test(publicId)
  ) {
    throw badRequest(kind === "avatar" ? "Invalid profile photo" : "Invalid student ID image");
  }
  return publicId;
}

/** Short-lived signed URL for admins to view a private student ID photo. */
export function signedPrivateUrl(publicId: string | null, width?: number): string | null {
  if (!publicId) return null;
  const c = getCloudinaryConfig();
  if (!c) return null;
  cloudinary.config({
    cloud_name: c.cloudName,
    api_key: c.apiKey,
    api_secret: c.apiSecret,
    secure: true,
  });
  return cloudinary.url(publicId, {
    ...(width
      ? { transformation: [{ width, crop: "limit", quality: "auto", fetch_format: "auto" }] }
      : {}),
    type: "authenticated",
    sign_url: true,
    secure: true,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
  } as never);
}
