import "server-only";

import sharp from "sharp";

import { getAuthSdk } from "@/lib/auth-graphql";
import { MAX_AVATAR_SIZE_BYTES } from "@/lib/avatar";

/** Square edge, in pixels, of the normalized avatar uploaded to the engine. */
export const EXTERNAL_AVATAR_EXPORT_PX = 512;

const DOWNLOAD_TIMEOUT_MS = 10_000;
const UPLOAD_TIMEOUT_MS = 15_000;
/** Hard cap on the fetched source image; the processed avatar is far smaller. */
const MAX_DOWNLOAD_BYTES = 8 * 1024 * 1024;
/** Decompression-bomb guard for the source image. */
const MAX_SOURCE_PIXELS = 50_000_000;

function httpsUrl(value: unknown): URL | null {
  if (typeof value !== "string" || !value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

/**
 * Request a larger crop from Google's userinfo `picture` URL (`=s96-c` suffix
 * or legacy `sz` param). Unknown formats pass through unchanged; the importer
 * resizes server-side regardless.
 */
export function normalizeGooglePictureUrl(value: unknown, size = EXTERNAL_AVATAR_EXPORT_PX): string | undefined {
  const url = httpsUrl(value);
  if (!url) return undefined;
  const href = url.toString();
  if (/=s\d+(-c)?(?=[?#]|$)/.test(href)) {
    return href.replace(/=s\d+(-c)?(?=[?#]|$)/, `=s${size}-c`);
  }
  if (url.searchParams.has("sz")) {
    url.searchParams.set("sz", String(size));
    return url.toString();
  }
  return href;
}

/** Request a larger raster from a GitHub `avatar_url` (`s` param). */
export function normalizeGitHubAvatarUrl(value: unknown, size = EXTERNAL_AVATAR_EXPORT_PX): string | undefined {
  const url = httpsUrl(value);
  if (!url) return undefined;
  url.searchParams.set("s", String(size));
  return url.toString();
}

async function resolveDefaultVariationId(sdk: ReturnType<typeof getAuthSdk>, auid: string): Promise<string | null> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 5; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 300 * Math.pow(2, attempt - 1)));
    }
    try {
      const result = await sdk.DefaultVariation({ auid });
      const variationId = result.defaultVariation?.variationId;
      if (variationId) return variationId;
      lastError = new Error("The account does not have a default variation yet");
    } catch (error) {
      lastError = error;
    }
  }
  console.warn("[External avatar import skipped]", { reason: "no-default-variation", error: lastError instanceof Error ? lastError.message : "unknown" });
  return null;
}

async function processToAvatarJpeg(source: Buffer): Promise<Buffer | null> {
  // The editor exports a 512px JPEG ladder; mirror that server-side so every
  // provider picture ends up a compliant square without client work.
  const ladder: Array<{ px: number; quality: number }> = [
    { px: EXTERNAL_AVATAR_EXPORT_PX, quality: 85 },
    { px: EXTERNAL_AVATAR_EXPORT_PX, quality: 75 },
    { px: 256, quality: 70 },
  ];
  for (const { px, quality } of ladder) {
    try {
      const output = await sharp(source, { limitInputPixels: MAX_SOURCE_PIXELS })
        .rotate()
        .resize(px, px, { fit: "cover", position: "center" })
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();
      if (output.length > 0 && output.length <= MAX_AVATAR_SIZE_BYTES) {
        return output;
      }
    } catch {
      // Undecodable source (SVG bomb, truncated file, …): give up, don't retry.
      return null;
    }
  }
  return null;
}

/**
 * Copy a provider-hosted profile picture into the account's default variation
 * avatar. Best-effort by design: every failure path logs and returns false so
 * registration and login flows never break because of a picture.
 */
export async function importExternalAvatar(params: {
  auid: string;
  tokenId: string;
  pictureUrl?: string;
  /** When true (default), keep an avatar the user already set. */
  onlyIfEmpty?: boolean;
}): Promise<boolean> {
  const url = httpsUrl(params.pictureUrl);
  if (!url) return false;

  const sdk = getAuthSdk(params.tokenId);
  const variationId = await resolveDefaultVariationId(sdk, params.auid);
  if (!variationId) return false;

  if (params.onlyIfEmpty !== false) {
    try {
      const existing = await sdk.Avatar({ variationId });
      if (existing.avatar?.objectKey) return false;
    } catch {
      // Fail closed: never risk overwriting a photo we couldn't read.
      console.warn("[External avatar import skipped]", { reason: "avatar-read-failed" });
      return false;
    }
  }

  let source: Buffer;
  try {
    const response = await fetch(url.toString(), {
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    });
    if (!response.ok) return false;
    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_DOWNLOAD_BYTES) return false;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length === 0 || bytes.length > MAX_DOWNLOAD_BYTES) return false;
    source = bytes;
  } catch {
    return false;
  }

  const avatar = await processToAvatarJpeg(source);
  if (!avatar) return false;

  try {
    const prepared = await sdk.RequestAvatarUpload({
      auid: params.auid,
      variationId,
      contentType: "image/jpeg",
      sizeBytes: avatar.length,
    });
    const upload = await fetch(prepared.requestAvatarUpload.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "image/jpeg" },
      body: new Blob([new Uint8Array(avatar)], { type: "image/jpeg" }),
      signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
    });
    if (!upload.ok) return false;
    await sdk.ConfirmAvatarUpload({
      auid: params.auid,
      variationId,
      objectKey: prepared.requestAvatarUpload.objectKey,
    });
    return true;
  } catch {
    console.warn("[External avatar import skipped]", { reason: "upload-failed" });
    return false;
  }
}
