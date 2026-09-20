import { oauthError } from "@/lib/oauth/adapter";
import { revokeByAccessToken } from "@/lib/oauth/access-token";
import { parseRequestBody, revokeRequestSchema } from "@/lib/oauth/schemas";
import { revokeByRefreshToken } from "@/lib/oauth/refresh-token";

export async function POST(request: Request) {
  const body = await parseRequestBody(request);
  const parsed = revokeRequestSchema.safeParse(body);

  if (!parsed.success) {
    return oauthError(
      "invalid_request",
      parsed.error.issues[0]?.message ?? "Invalid revoke request",
    );
  }

  const token = parsed.data.token;

  // token_type_hint is optional in RFC 7009, so both kinds are tried. Either way the whole
  // authorization ends: the app's native token is revoked at the engine, and its remaining
  // access and refresh tokens go with it.
  try {
    const revoked = await revokeByRefreshToken(token);
    if (!revoked) {
      await revokeByAccessToken(token);
    }
  } catch {
    // An unknown token is still a successful revocation.
  }

  return new Response(null, { status: 200 });
}
