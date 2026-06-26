import { oauthError, revokeWithBackend } from "@/lib/oauth/adapter";
import { parseRequestBody, revokeRequestSchema } from "@/lib/oauth/schemas";

export async function POST(request: Request) {
  const body = await parseRequestBody(request);
  const parsed = revokeRequestSchema.safeParse(body);

  if (!parsed.success) {
    return oauthError(
      "invalid_request",
      parsed.error.issues[0]?.message ?? "Invalid revoke request",
    );
  }

  try {
    await revokeWithBackend(parsed.data.token);
  } catch {
    // RFC 7009: revocation endpoint returns 200 even if token is unknown
  }

  return new Response(null, { status: 200 });
}
