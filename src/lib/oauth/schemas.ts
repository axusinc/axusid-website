import { z } from "zod";

export const authorizeQuerySchema = z.object({
  response_type: z.literal("code"),
  client_id: z.string().min(1),
  redirect_uri: z.string().url(),
  scope: z.string().optional(),
  state: z.string().optional(),
  nonce: z.string().optional(),
  code_challenge: z.string().optional(),
  code_challenge_method: z.literal("S256").optional(),
});

export const tokenRequestSchema = z.discriminatedUnion("grant_type", [
  z.object({
    grant_type: z.literal("authorization_code"),
    code: z.string().min(1),
    redirect_uri: z.string().url(),
    client_id: z.string().min(1),
    client_secret: z.string().optional(),
    code_verifier: z.string().optional(),
  }),
  z.object({
    grant_type: z.literal("refresh_token"),
    refresh_token: z.string().min(1),
    client_id: z.string().min(1).optional(),
    client_secret: z.string().optional(),
  }),
]);

export function extractBasicAuth(request: Request): { clientId?: string; clientSecret?: string } {
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
    const clientSecret = credentials.substring(colonIndex + 1);
    return {
      clientId: clientId ? decodeURIComponent(clientId) : undefined,
      clientSecret: clientSecret ? decodeURIComponent(clientSecret) : undefined,
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




