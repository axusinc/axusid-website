import { resolveAccessToken } from "@/lib/oauth/access-token";
import { oauthError } from "@/lib/oauth/adapter";
import { getOAuthClient } from "@/lib/oauth/clients";
import { getIssuer } from "@/lib/oauth/constants";
import { extractBasicAuth, parseRequestBody } from "@/lib/oauth/schemas";

const INACTIVE = { active: false } as const;

function json(body: unknown) {
  return Response.json(body, {
    headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
  });
}

/**
 * RFC 7662 introspection, for apps holding an opaque access token. A client may only ask about
 * its own tokens: answering for someone else's would turn this into an oracle for guessed
 * tokens.
 */
export async function POST(request: Request) {
  const body = await parseRequestBody(request);
  const clientId = body.client_id ?? extractBasicAuth(request).clientId;

  if (!clientId) {
    return oauthError("invalid_client", "client_id is required", 401);
  }

  const client = await getOAuthClient(clientId);
  if (!client) {
    return oauthError("invalid_client", "Unknown client_id", 401);
  }

  if (!body.token) {
    return oauthError("invalid_request", "token is required");
  }

  const resolved = await resolveAccessToken(body.token);
  if (!resolved || resolved.clientAuid !== client.auid) {
    return json(INACTIVE);
  }

  return json({
    active: true,
    scope: resolved.scopes.join(" "),
    client_id: resolved.clientAuid,
    sub: resolved.userAuid,
    token_type: "Bearer",
    exp: Math.floor(resolved.expiresAt.getTime() / 1000),
    iss: getIssuer(),
  });
}
