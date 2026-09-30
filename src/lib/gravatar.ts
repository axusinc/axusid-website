import "server-only";

import sharp from "sharp";
import { getAuthSdk } from "@/lib/auth-graphql";
import { avatarImageUrl } from "@/lib/avatar-server";
import { MAX_AVATAR_SIZE_BYTES } from "@/lib/avatar";
import { findGravatarAccount } from "@/lib/gravatar-accounts";

const PUBLIC_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=300",
  "X-Content-Type-Options": "nosniff",
};

/** Bound downloads even when object storage omits Content-Length. */
async function readAvatar(response: Response): Promise<Buffer> {
  if (Number(response.headers.get("content-length")) > MAX_AVATAR_SIZE_BYTES) {
    await response.body?.cancel();
    throw new Error("Avatar is too large");
  }
  if (!response.body) throw new Error("Avatar has no body");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > MAX_AVATAR_SIZE_BYTES) throw new Error("Avatar is too large");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
  return Buffer.concat(chunks, length);
}

function defaultAvatar(hash: string, size: number, query: URLSearchParams): Response {
  const defaultImage = query.get("d") ?? query.get("default");
  if (defaultImage === "404") {
    return new Response(null, { status: 404, headers: PUBLIC_HEADERS });
  }

  // Use Gravatar's built-in generators and custom default URL handling. Force
  // the fallback so a real Gravatar can never replace an AXUS account's image.
  const url = new URL(`https://www.gravatar.com/avatar/${hash}`);
  url.searchParams.set("s", String(size));
  url.searchParams.set("f", "y");
  if (defaultImage) url.searchParams.set("d", defaultImage);
  for (const key of ["r", "rating", "initials", "name"]) {
    const value = query.get(key);
    if (value !== null) url.searchParams.set(key, value);
  }
  return new Response(null, {
    status: 302,
    headers: { ...PUBLIC_HEADERS, Location: url.href },
  });
}

export async function serveGravatar(request: Request, emailHash: string): Promise<Response> {
  const hash = emailHash.replace(/\.jpg$/i, "").toLowerCase();
  if (!/^(?:[a-f0-9]{32}|[a-f0-9]{64})$/.test(hash)) {
    return new Response("Invalid email hash", {
      status: 400,
      headers: { ...PUBLIC_HEADERS, "Cache-Control": "no-store" },
    });
  }

  const query = new URL(request.url).searchParams;
  const requestedSize = query.get("s") ?? query.get("size") ?? "80";
  const size = /^\d+$/.test(requestedSize) && Number(requestedSize) >= 1 && Number(requestedSize) <= 2048
    ? Number(requestedSize) : 80;
  if ((query.get("f") ?? query.get("forcedefault")) === "y") {
    return defaultAvatar(hash, size, query);
  }

  try {
    const auid = await findGravatarAccount(hash);
    if (!auid) return defaultAvatar(hash, size, query);

    // Read the public default variation on each request so profile switches,
    // avatar replacements and clears take effect after the short cache TTL.
    const sdk = getAuthSdk();
    const signal = AbortSignal.timeout(10_000);
    const { defaultVariation } = await sdk.DefaultVariation({ auid }, undefined, signal);
    if (!defaultVariation) return defaultAvatar(hash, size, query);
    const variationId = defaultVariation.variationId;
    const { avatar } = await sdk.Avatar({ variationId }, undefined, signal);
    if (!avatar?.objectKey) return defaultAvatar(hash, size, query);

    const response = await fetch(avatarImageUrl(variationId, avatar.updatedAt), {
      signal,
      cache: "no-store",
    });
    if (response.status === 404) return defaultAvatar(hash, size, query);
    if (!response.ok) throw new Error(`Avatar download failed: ${response.status}`);

    const image = await sharp(await readAvatar(response), { limitInputPixels: 50_000_000 })
      .rotate()
      .resize(size, size, { fit: "cover", position: "center" })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 85 })
      .toBuffer();
    return new Response(new Uint8Array(image), {
      headers: { ...PUBLIC_HEADERS, "Content-Type": "image/jpeg" },
    });
  } catch (error) {
    console.error("[Gravatar] Avatar lookup failed:", error);
    return new Response("Avatar service unavailable", {
      status: 503,
      headers: { ...PUBLIC_HEADERS, "Cache-Control": "no-store", "Retry-After": "30" },
    });
  }
}
