import "server-only";

/**
 * Absolute browser-usable URL for a variation's avatar image. The engine
 * answers with a short-lived redirect to object storage, so the stable
 * REST URL itself is what belongs in <img src>.
 */
export function avatarImageUrl(variationId: string): string {
  const endpoint = process.env.AUTH_GRAPHQL_ENDPOINT;
  if (!endpoint) {
    throw new Error("AUTH_GRAPHQL_ENDPOINT is not configured");
  }
  const base = endpoint.replace(/\/graphql\/?$/, "");
  return `${base}/v1/variations/${encodeURIComponent(variationId)}/avatar`;
}
