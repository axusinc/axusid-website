export function resolveAuthenticatedRedirect(options: {
  redirectUri?: string;
  next?: string;
}): string {
  const { redirectUri, next } = options;

  if (redirectUri?.startsWith("/") && !redirectUri.startsWith("//")) {
    return redirectUri;
  }
  if (next?.startsWith("/") && !next.startsWith("//")) {
    return next;
  }
  return "/account";
}
