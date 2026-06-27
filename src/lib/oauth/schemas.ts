import { z } from "zod";

export const authorizeQuerySchema = z.object({
  response_type: z.literal("code"),
  client_id: z.string().min(1),
  redirect_uri: z.string().url(),
  scope: z.string().optional(),
  state: z.string().optional(),
  code_challenge: z.string().min(1),
  code_challenge_method: z.literal("S256"),
});

export const tokenRequestSchema = z.discriminatedUnion("grant_type", [
  z.object({
    grant_type: z.literal("authorization_code"),
    code: z.string().min(1),
    redirect_uri: z.string().url(),
    client_id: z.string().min(1),
    code_verifier: z.string().min(43).max(128),
  }),
  z.object({
    grant_type: z.literal("refresh_token"),
    refresh_token: z.string().min(1),
    client_id: z.string().min(1).optional(),
  }),
]);

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

export function buildAuthorizeResumeUrl(): string {
  return "/authorize?resume=1";
}

export function buildLoginOAuthUrl(): string {
  return "/login?oauth=1";
}

export function buildAuthorizeReturnUrl(params: AuthorizeQuery): string {
  const search = new URLSearchParams({
    response_type: params.response_type,
    client_id: params.client_id,
    redirect_uri: params.redirect_uri,
    code_challenge: params.code_challenge,
    code_challenge_method: params.code_challenge_method,
  });

  if (params.scope) {
    search.set("scope", params.scope);
  }

  if (params.state) {
    search.set("state", params.state);
  }

  return `/authorize?${search.toString()}`;
}

export function serializeOAuthParams(params: AuthorizeQuery): string {
  return buildAuthorizeReturnUrl(params).replace("/authorize?", "");
}
