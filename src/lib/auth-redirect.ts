export function resolveAuthenticatedRedirect(options: {
  redirectUri?: string;
  next?: string;
}): string {
  const { redirectUri, next } = options;

  if (redirectUri?.startsWith("/") && !redirectUri.startsWith("//")) {
    if (redirectUri.startsWith("/authorize")) {
      try {
        const url = new URL(redirectUri, "http://localhost");
        const prompt = url.searchParams.get("prompt") || "";
        const promptTokens = new Set(prompt.trim().split(/\s+/));

        if (promptTokens.has("login")) {
          url.searchParams.set("prompt_reauth", "true");
        }
        if (promptTokens.has("select_account")) {
          url.searchParams.set("account_selected", "true");
        }
        return `${url.pathname}${url.search}`;
      } catch {
        return redirectUri;
      }
    }
    return redirectUri;
  }
  if (next?.startsWith("/") && !next.startsWith("//")) {
    return next;
  }
  return "/account";
}
