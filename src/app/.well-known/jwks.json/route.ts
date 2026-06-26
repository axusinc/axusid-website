import { exportJwks } from "@/lib/oauth/jwt";

export async function GET() {
  const jwks = await exportJwks();
  return Response.json(jwks, {
    headers: {
      "Cache-Control": "public, max-age=3600",
    },
  });
}
