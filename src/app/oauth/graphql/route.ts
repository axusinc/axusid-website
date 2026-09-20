import { resolveAccessToken } from "@/lib/oauth/access-token";
import { touchGrant } from "@/lib/oauth/grants";

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

function getEndpoint(): string {
  const endpoint = process.env.AUTH_GRAPHQL_ENDPOINT;
  if (!endpoint) {
    throw new Error("AUTH_GRAPHQL_ENDPOINT is not configured");
  }
  return endpoint;
}

/**
 * The engine speaks only native tokens, so an app holding an OAuth access token calls it
 * through here: the access token is exchanged for the authorization's native token and the
 * query is passed straight on. An app can equally call the engine itself with the
 * axus_access_token from the token response - this exists for apps that would rather keep one
 * OAuth credential, and it means a revoked access token stops working at once.
 */
export async function POST(request: Request) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return unauthorized("Missing or invalid Authorization header");
  }

  const resolved = await resolveAccessToken(header.slice("Bearer ".length).trim());
  if (!resolved) {
    return unauthorized("Access token is invalid, expired or revoked");
  }

  const body = await request.text();
  const response = await fetch(getEndpoint(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resolved.grant.tokenId}`,
    },
    body,
  });

  await touchGrant(resolved.grant.id);

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-store",
    },
  });
}
