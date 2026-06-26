import { buildOidcClaims } from "@/lib/oauth/claims";
import { verifyAccessToken } from "@/lib/oauth/jwt";

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

  let claimsContext: { sub: string; aud: string; scope: string };
  try {
    claimsContext = await verifyAccessToken(token);
  } catch {
    return unauthorized("Access token is invalid or expired");
  }

  const scopes = claimsContext.scope.split(/\s+/).filter(Boolean);
  if (!scopes.includes("openid")) {
    return unauthorized("Access token does not include the openid scope");
  }

  try {
    const profileClaims = await buildOidcClaims(
      claimsContext.sub,
      "",
      scopes,
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
