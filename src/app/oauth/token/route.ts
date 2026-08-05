import { oauthError } from "@/lib/oauth/adapter";
import { formatGraphqlError } from "@/lib/graphql-errors";
import { consumeAuthorizationCode } from "@/lib/oauth/auth-code-store";
import { getOAuthClient } from "@/lib/oauth/clients";
import { verifyPkceChallenge } from "@/lib/oauth/pkce";
import { extractBasicAuth, parseRequestBody, tokenRequestSchema } from "@/lib/oauth/schemas";
import {
  issueTokenResponse,
  refreshTokenResponse,
} from "@/lib/oauth/token-response";

export async function POST(request: Request) {
  const body = await parseRequestBody(request);
  const basicAuth = extractBasicAuth(request);

  if (!body.client_id) {
    if (basicAuth.clientId) {
      body.client_id = basicAuth.clientId;
    } else if (body.auid) {
      body.client_id = body.auid;
    }
  }
  if (!body.client_secret && basicAuth.clientSecret) {
    body.client_secret = basicAuth.clientSecret;
  }

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
      const tokenResponse = await refreshTokenResponse(payload.refresh_token);
      return Response.json(tokenResponse, {
        headers: {
          "Cache-Control": "no-store",
          Pragma: "no-cache",
        },
      });
    } catch (error) {
      return oauthError(
        "invalid_grant",
        formatGraphqlError(error, "oauth-refresh", "Refresh failed"),
        401,
      );
    }
  }

  const client = await getOAuthClient(payload.client_id);
  if (!client) {
    return oauthError("invalid_client", "Unknown client_id", 401);
  }

  const record = await consumeAuthorizationCode(payload.code);
  if (!record) {
    return oauthError(
      "invalid_grant",
      "Authorization code is invalid or expired",
      400,
    );
  }

  if (record.clientAuid !== payload.client_id) {
    return oauthError("invalid_grant", "client_id mismatch", 400);
  }

  if (record.redirectUri !== payload.redirect_uri) {
    return oauthError("invalid_grant", "redirect_uri mismatch", 400);
  }

  if (record.codeChallenge) {
    if (!payload.code_verifier) {
      return oauthError("invalid_grant", "code_verifier required for PKCE", 400);
    }
    const pkceValid = await verifyPkceChallenge(
      payload.code_verifier,
      record.codeChallenge,
    );

    if (!pkceValid) {
      return oauthError("invalid_grant", "PKCE verification failed", 400);
    }
  }

  try {
    const tokenResponse = await issueTokenResponse({
      auid: record.userAuid,
      clientId: record.clientAuid,
      scopes: record.scopes,
      credentials: record.credentials,
      nonce: record.nonce,
    });

    return Response.json(tokenResponse, {
      headers: {
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
    });
  } catch (error) {
    return oauthError(
      "server_error",
      formatGraphqlError(error, "oauth", "Token issuance failed"),
      500,
    );
  }
}
