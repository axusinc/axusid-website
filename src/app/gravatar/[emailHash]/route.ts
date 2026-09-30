import { serveGravatar } from "@/lib/gravatar";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ emailHash: string }> },
): Promise<Response> {
  const { emailHash } = await params;
  return serveGravatar(request, emailHash);
}
