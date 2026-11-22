import type { UploadKind, UploadSignature } from "@shared/types";
import { apiPost } from "@/lib/api";

const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Uploads an image straight from the browser to Cloudinary using a short-lived
 * signature from our API. Returns the public URL, or for private kinds
 * (student ID and profile photos) the Cloudinary public_id.
 */
export async function uploadImage(file: File, kind: UploadKind): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > MAX_BYTES) throw new Error("Images must be smaller than 8 MB.");
  const sig = await apiPost<UploadSignature>("/uploads/sign", { kind });
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.apiKey);
  form.append("timestamp", String(sig.timestamp));
  form.append("signature", sig.signature);
  form.append("folder", sig.folder);
  if (sig.type === "authenticated") form.append("type", "authenticated");
  const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
    method: "POST",
    body: form,
  });
  const data = (await res.json().catch(() => ({}))) as {
    secure_url?: string;
    public_id?: string;
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(data.error?.message ?? "Image upload failed.");
  if (sig.type === "authenticated") return data.public_id!;
  return data.secure_url!;
}

/** Smaller delivery URL for thumbnails (Cloudinary on-the-fly transform). */
export function thumbUrl(url: string | null | undefined, width = 400): string | null {
  if (!url) return null;
  return url.includes("/image/upload/")
    ? url.replace("/image/upload/", `/image/upload/c_limit,w_${width},q_auto,f_auto/`)
    : url;
}
