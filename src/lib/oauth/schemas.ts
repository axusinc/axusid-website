import { z } from "zod";

export const authorizeQuerySchema = z.object({
  response_type: z.literal("code"),
  client_id: z.string().min(1),
  redirect_uri: z.string().url(),
  scope: z.string().optional(),
  state: z.string().optional(),
  nonce: z.string().optional(),
  // PKCE is mandatory. There are no client secrets here, so the code challenge is the only
  // thing tying an authorization code to the client that asked for it.
  code_challenge: z.string().min(43, "code_challenge is required (PKCE)"),
  code_challenge_method: z.literal("S256", {
    message: "code_challenge_method must be S256",
  }),
  prompt: z.string().optional(),
});

export const tokenRequestSchema = z.discriminatedUnion("grant_type", [
  z.object({
    grant_type: z.literal("authorization_code"),
    code: z.string().min(1),
    redirect_uri: z.string().url(),
    client_id: z.string().min(1),
    code_verifier: z.string().min(43, "code_verifier is required (PKCE)"),
  }),
  z.object({
    grant_type: z.literal("refresh_token"),
    refresh_token: z.string().min(1),
    // Required: a refresh token is bound to the client it was issued to, and that can only be
    // checked if the client says who it is.
    client_id: z.string().min(1),
  }),
]);

/**
 * Clients have no secrets, but some libraries still send the client id through Basic auth, so
 * the id is read from there when the body does not carry one. Anything in the password half is
 * ignored.
 */
export function extractBasicAuth(request: Request): { clientId?: string } {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Basic ")) {
    return {};
  }
  try {
    const credentials = Buffer.from(authHeader.slice(6), "base64").toString("utf-8");
    const colonIndex = credentials.indexOf(":");
    if (colonIndex === -1) {
      return {};
    }
    const clientId = credentials.substring(0, colonIndex);
    return {
      clientId: clientId ? decodeURIComponent(clientId) : undefined,
    };
  } catch {
    return {};
  }
}

export const revokeRequestSchema = z.object({
  token: z.string().min(1),
  token_type_hint: z.enum(["refresh_token", "access_token"]).optional(),
});

export type AuthorizeQuery = z.infer<typeof authorizeQuerySchema>;

export function parseFormBody(body: string): Record<string, string> {
  const params = new URLSearchParams(body);
  const result: Record<string, string> = {};

  for (const [key, value] of params.entries()) {
    result[key] = value;
  }

  return result;
}

export async function parseRequestBody(
  request: Request,
): Promise<Record<string, string>> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const json = (await request.json()) as Record<string, unknown>;
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(json)) {
      if (typeof value === "string") {
        result[key] = value;
      }
    }

    return result;
  }

  return parseFormBody(await request.text());
}




