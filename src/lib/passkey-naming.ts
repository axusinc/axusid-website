export const DEFAULT_PASSKEY_NAME = "My passkey";
export const ICLOUD_KEYCHAIN_NAME = "iCloud Keychain";
export const GOOGLE_PASSWORD_MANAGER_NAME = "Google Password Manager";
export const WINDOWS_HELLO_NAME = "Windows Hello";

const MAX_NAME_LENGTH = 64;

export type PlatformHints = {
  userAgent?: string | null;
  /** e.g. navigator.userAgentData?.platform ("macOS", "Windows", "Android", "iOS") */
  userAgentDataPlatform?: string | null;
  /** legacy navigator.platform ("MacIntel", "Win32", "Linux x86_64", ...) */
  platform?: string | null;
  maxTouchPoints?: number | null;
};

function normalize(value?: string | null): string {
  return (value ?? "").toLowerCase();
}

/**
 * Suggests a passkey name based on the device platform so the prefilled value
 * matches where the passkey will actually be stored.
 *
 * OS-first mapping:
 * - Apple (iPhone/iPad/Mac) -> "iCloud Keychain"
 * - Windows -> "Windows Hello"
 * - Android / ChromeOS -> "Google Password Manager"
 * - Other Chrome-family browsers -> "Google Password Manager" (Chrome syncs
 *   passkeys on Linux too)
 * - Unknown -> "My passkey"
 */
export function getSuggestedPasskeyName(hints: PlatformHints = {}): string {
  const ua = normalize(hints.userAgent);
  const navPlatform = normalize(hints.platform);
  const uaDataPlatform = normalize(hints.userAgentDataPlatform);

  const isApple =
    ua.includes("iphone") ||
    ua.includes("ipad") ||
    ua.includes("ipod") ||
    ua.includes("macintosh") ||
    ua.includes("mac os") ||
    navPlatform.includes("mac") ||
    navPlatform.includes("iphone") ||
    navPlatform.includes("ipad") ||
    uaDataPlatform.includes("macos") ||
    uaDataPlatform === "ios";

  // iPadOS 13+ reports as Macintosh; touch points disambiguate but the
  // suggestion is identical, so no special-casing needed beyond isApple.
  if (isApple) {
    return ICLOUD_KEYCHAIN_NAME;
  }

  const isWindows =
    ua.includes("windows") ||
    navPlatform.includes("win") ||
    uaDataPlatform.includes("windows");
  if (isWindows) {
    return WINDOWS_HELLO_NAME;
  }

  const isAndroid =
    ua.includes("android") || navPlatform.includes("android") || uaDataPlatform.includes("android");
  const isChromeOs =
    ua.includes("cros") ||
    ua.includes("chromeos") ||
    navPlatform.includes("cros") ||
    uaDataPlatform.includes("chromeos");
  if (isAndroid || isChromeOs) {
    return GOOGLE_PASSWORD_MANAGER_NAME;
  }

  const isChromeFamily =
    ua.includes("chrome") ||
    ua.includes("chromium") ||
    ua.includes("edg/") ||
    ua.includes("edge") ||
    ua.includes("opr/") ||
    ua.includes("opera") ||
    ua.includes("brave") ||
    ua.includes("samsungbrowser") ||
    ua.includes("whale");
  if (isChromeFamily) {
    return GOOGLE_PASSWORD_MANAGER_NAME;
  }

  return DEFAULT_PASSKEY_NAME;
}

/** Reads the current browser's navigator hints. Safe to call during SSR. */
export function getNavigatorPasskeyHints(): PlatformHints {
  if (typeof navigator === "undefined") {
    return {};
  }
  const nav = navigator as Navigator & {
    userAgentData?: { platform?: string };
  };
  return {
    userAgent: typeof nav.userAgent === "string" ? nav.userAgent : undefined,
    platform: typeof nav.platform === "string" ? nav.platform : undefined,
    userAgentDataPlatform: nav.userAgentData?.platform,
    maxTouchPoints: typeof nav.maxTouchPoints === "number" ? nav.maxTouchPoints : undefined,
  };
}

/** Convenience wrapper: suggest a name from the current browser. */
export function getSuggestedPasskeyNameFromNavigator(): string {
  return getSuggestedPasskeyName(getNavigatorPasskeyHints());
}

/**
 * Appends " 2", " 3", ... when the suggestion collides with an existing
 * passkey name (case-insensitive). Keeps the result within 64 chars.
 */
export function ensureUniquePasskeyName(
  base: string,
  existingNames: Array<string | null | undefined> = [],
): string {
  const trimmedBase = base.trim() || DEFAULT_PASSKEY_NAME;
  const taken = new Set(
    existingNames
      .map((name) => (name ?? "").trim().toLowerCase())
      .filter((name) => name.length > 0),
  );

  if (!taken.has(trimmedBase.toLowerCase())) {
    return trimmedBase;
  }

  let counter = 2;
  while (counter < 1000) {
    const suffix = ` ${counter}`;
    const candidate =
      trimmedBase.length + suffix.length > MAX_NAME_LENGTH
        ? `${trimmedBase.slice(0, MAX_NAME_LENGTH - suffix.length).trimEnd()}${suffix}`
        : `${trimmedBase}${suffix}`;
    if (!taken.has(candidate.toLowerCase())) {
      return candidate;
    }
    counter += 1;
  }
  return trimmedBase;
}
