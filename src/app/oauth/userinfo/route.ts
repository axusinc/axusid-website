import { resolveAccessToken } from "@/lib/oauth/access-token";
import { buildOidcClaims } from "@/lib/oauth/claims";

function unauthorized(description: string): Response {
  return Response.json(
    { error: "invalid_token", error_description: description },
    {
      status: 401,
      headers: {
        "Cache-Control": "no-store",
        "WWW-Authenticate": 'Bearer error="invalid_token"',
      },
    },
  );
}

function parseBearerToken(request: Request): string | undefined {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return undefined;
  }
  return header.slice("Bearer ".length).trim();
}

async function handleUserinfo(request: Request): Promise<Response> {
  const token = parseBearerToken(request);
  if (!token) {
    return unauthorized("Missing or invalid Authorization header");
  }

  const resolved = await resolveAccessToken(token);
  if (!resolved) {
    return unauthorized("Access token is invalid, expired or revoked");
  }

  const oidcScopes = resolved.scopes.filter((scope) =>
    ["openid", "profile", "email", "offline_access"].includes(scope),
  );
  if (!oidcScopes.includes("openid")) {
    return unauthorized("Access token does not include the openid scope");
  }

  try {
    // Read the profile as the app's own token, so the engine sees who is asking.
    const profileClaims = await buildOidcClaims(
      resolved.userAuid,
      resolved.grant.tokenId,
      oidcScopes,
    );

    return Response.json(profileClaims, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return unauthorized("Unable to resolve user profile");
  }
}

export async function GET(request: Request) {
  return handleUserinfo(request);
}

export async function POST(request: Request) {
  return handleUserinfo(request);
}
