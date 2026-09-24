export const ALLOWED_AVATAR_CONTENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export type AllowedAvatarContentType = (typeof ALLOWED_AVATAR_CONTENT_TYPES)[number];

export const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;

export function isAllowedAvatarContentType(
  contentType: string,
): contentType is AllowedAvatarContentType {
  return (ALLOWED_AVATAR_CONTENT_TYPES as readonly string[]).includes(contentType);
}

export function validateAvatarFile(file: {
  type: string;
  size: number;
}): string | null {
  if (!isAllowedAvatarContentType(file.type)) {
    return "Choose a PNG, JPEG, or WebP image.";
  }
  if (!file.size || file.size <= 0) {
    return "That file looks empty. Choose another image.";
  }
  if (file.size > MAX_AVATAR_SIZE_BYTES) {
    return "Images must be 2 MB or smaller.";
  }
  return null;
}
