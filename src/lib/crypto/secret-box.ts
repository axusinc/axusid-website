import "server-only";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not configured");
  }
  return secret;
}

async function deriveKey(): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(getSecret()));
  return crypto.subtle.importKey(
    "raw",
    digest,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding =
    padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + padding);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export async function encryptJson<T>(value: T): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey();
  const plaintext = encoder.encode(JSON.stringify(value));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return toBase64Url(combined);
}

export async function decryptJson<T>(payload: string): Promise<T> {
  const combined = fromBase64Url(payload);
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const key = await deriveKey();
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return JSON.parse(decoder.decode(plaintext)) as T;
}

export async function encryptJsonIfNeeded(value: unknown): Promise<unknown> {
  if (typeof value === "string") {
    try {
      await decryptJson(value);
      return value;
    } catch {
      return encryptJson(value);
    }
  }
  return encryptJson(value);
}
