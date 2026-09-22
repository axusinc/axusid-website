export type LastAuthMethod = "password" | "google" | "github" | "passkey";

export const LAST_AUTH_METHOD_COOKIE = "axus_last_auth_method";
export const LAST_AUTH_METHOD_STORAGE_KEY = "axus_last_auth_method";
const AUTH_METHOD_EVENT = "axus:auth-method-change";

export const lastAuthMethodCookieOptions = {
  path: "/",
  httpOnly: false,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 365 * 24 * 60 * 60, // 1 year
};

export function isValidAuthMethod(val: unknown): val is LastAuthMethod {
  return val === "password" || val === "google" || val === "github" || val === "passkey";
}

export function getClientLastAuthMethod(): LastAuthMethod | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.localStorage.getItem(LAST_AUTH_METHOD_STORAGE_KEY);
    if (isValidAuthMethod(stored)) return stored;
  } catch {
    // Ignore if localStorage is unavailable
  }

  try {
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${LAST_AUTH_METHOD_COOKIE}=`));
    if (match) {
      const val = decodeURIComponent(match.split("=")[1]);
      if (isValidAuthMethod(val)) return val;
    }
  } catch {
    // Ignore cookie read errors
  }

  return null;
}

export function subscribeLastAuthMethod(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  window.addEventListener("storage", callback);
  window.addEventListener(AUTH_METHOD_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(AUTH_METHOD_EVENT, callback);
  };
}

export function setClientLastAuthMethod(method: LastAuthMethod): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(LAST_AUTH_METHOD_STORAGE_KEY, method);
  } catch {
    // Ignore if localStorage is unavailable
  }

  try {
    const isSecure = window.location.protocol === "https:";
    const maxAge = lastAuthMethodCookieOptions.maxAge;
    document.cookie = `${LAST_AUTH_METHOD_COOKIE}=${encodeURIComponent(
      method,
    )}; Path=/; Max-Age=${maxAge}; SameSite=Lax${isSecure ? "; Secure" : ""}`;
  } catch {
    // Ignore cookie write errors
  }

  try {
    window.dispatchEvent(new Event(AUTH_METHOD_EVENT));
  } catch {
    // Ignore dispatch error
  }
}
