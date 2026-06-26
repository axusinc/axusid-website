import {
  credentialsToTokenResponse,
  oauthError,
  refreshWithBackend,
} from "@/lib/oauth/adapter";
import { getOAuthClient } from "@/lib/oauth/clients";
import { verifyPkceChallenge } from "@/lib/oauth/pkce";
import { parseRequestBody, tokenRequestSchema } from "@/lib/oauth/schemas";
import { getAuthorizationCodeStore } from "@/lib/oauth/store";

export async function POST(request: Request) {
  const body = await parseRequestBody(request);
  const parsed = tokenRequestSchema.safeParse(body);

  if (!parsed.success) {
    return oauthError(
      "invalid_request",
      parsed.error.issues[0]?.message ?? "Invalid token request",
    );
  }

  const payload = parsed.data;

  if (payload.grant_type === "refresh_token") {
    try {
      const credentials = await refreshWithBackend(payload.refresh_token);
      return Response.json(credentialsToTokenResponse(credentials), {
        headers: {
          "Cache-Control": "no-store",
          Pragma: "no-cache",
        },
      });
    } catch (error) {
      return oauthError(
        "invalid_grant",
        error instanceof Error ? error.message : "Refresh failed",
        401,
      );
    }
  }

  const client = getOAuthClient(payload.client_id);
  if (!client) {
    return oauthError("invalid_client", "Unknown client_id", 401);
  }

  const record = getAuthorizationCodeStore().consume(payload.code);
  if (!record) {
    return oauthError("invalid_grant", "Authorization code is invalid or expired", 400);
  }

  if (record.clientId !== payload.client_id) {
    return oauthError("invalid_grant", "client_id mismatch", 400);
  }

  if (record.redirectUri !== payload.redirect_uri) {
    return oauthError("invalid_grant", "redirect_uri mismatch", 400);
  }

  const pkceValid = await verifyPkceChallenge(
    payload.code_verifier,
    record.codeChallenge,
  );

  if (!pkceValid) {
    return oauthError("invalid_grant", "PKCE verification failed", 400);
  }

  return Response.json(
    credentialsToTokenResponse(record.credentials, record.scopes.join(" ")),
    {
      headers: {
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
    },
  );
}
