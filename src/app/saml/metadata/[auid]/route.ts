import { NextRequest, NextResponse } from "next/server";
import { getSamlConfigByAuid } from "@/lib/saml/saml-store";
import { createIdentityProvider } from "@/lib/saml/saml-idp";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ auid: string }> }
) {
  const { auid } = await params;

  // Verify the user has a configured SAML Service Provider
  const samlConfig = await getSamlConfigByAuid(auid);
  if (!samlConfig) {
    return new NextResponse("SAML IdP not configured for this user", {
      status: 404,
      headers: { "Content-Type": "text/plain" },
    });
  }

  try {
    const idp = createIdentityProvider(auid);
    const xml = idp.getMetadata();

    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error generating SAML IdP metadata:", error);
    return new NextResponse("Internal Server Error", {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }
}
