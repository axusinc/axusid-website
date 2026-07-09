import { NextRequest, NextResponse } from "next/server";
import { getSamlConfigByAuid } from "@/lib/saml/saml-store";
import {
  createIdentityProvider,
  createServiceProvider,
  parseSamlLogoutRequest,
  parseSamlLogoutResponse,
  createSamlLogoutResponse,
} from "@/lib/saml/saml-idp";

async function handleSloRequest(
  request: NextRequest,
  auidParam: string,
  method: "GET" | "POST"
) {
  // 1. Retrieve the SAML Service Provider config
  const samlConfig = await getSamlConfigByAuid(auidParam);
  if (!samlConfig) {
    return new NextResponse("SAML IdP not configured for this user", {
      status: 404,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // 2. Parse request params based on binding
  let samlRequest: string | null = null;
  let samlResponse: string | null = null;
  let relayState: string = "";
  let sigAlg: string = "";
  let signature: string = "";

  if (method === "GET") {
    const searchParams = request.nextUrl.searchParams;
    samlRequest = searchParams.get("SAMLRequest");
    samlResponse = searchParams.get("SAMLResponse");
    relayState = searchParams.get("RelayState") || "";
    sigAlg = searchParams.get("SigAlg") || "";
    signature = searchParams.get("Signature") || "";
  } else {
    try {
      const bodyText = await request.text();
      const bodyParams = new URLSearchParams(bodyText);
      samlRequest = bodyParams.get("SAMLRequest");
      samlResponse = bodyParams.get("SAMLResponse");
      relayState = bodyParams.get("RelayState") || "";
    } catch (e) {
      console.error("Failed to parse POST body in SAML SLO:", e);
    }
  }

  if (samlRequest) {
    samlRequest = samlRequest.replace(/ /g, "+");
  }
  if (samlResponse) {
    samlResponse = samlResponse.replace(/ /g, "+");
  }

  try {
    const idp = createIdentityProvider(auidParam);
    const sp = createServiceProvider(samlConfig.entityId, samlConfig.acsUrl, samlConfig.sloUrl);
    const binding = method === "GET" ? "redirect" : "post";

    // Scenario A: It's a LogoutRequest from the SP (SP-initiated logout)
    if (samlRequest) {
      const reqParserObj = method === "GET"
        ? { query: { SAMLRequest: samlRequest, RelayState: relayState, SigAlg: sigAlg, Signature: signature } }
        : { body: { SAMLRequest: samlRequest, RelayState: relayState } };

      const requestInfo = await parseSamlLogoutRequest(idp, sp, binding, reqParserObj);

      // Do not log out of AXUS ID itself, just acknowledge logout for the application asking.

      // Create Logout Response
      const response = await createSamlLogoutResponse(idp, sp, requestInfo, relayState);

      // Redirect back to SP
      return NextResponse.redirect(response.context, 303);
    }

    // Scenario B: It's a LogoutResponse from the SP (SP confirming logout initiated by IdP)
    if (samlResponse) {
      const reqParserObj = method === "GET"
        ? { query: { SAMLResponse: samlResponse, RelayState: relayState, SigAlg: sigAlg, Signature: signature } }
        : { body: { SAMLResponse: samlResponse, RelayState: relayState } };

      // Parse/verify logout response
      try {
        await parseSamlLogoutResponse(idp, sp, binding, reqParserObj);
      } catch (err) {
        console.warn("Failed to verify SP logout response signature:", err);
      }

      // Redirect to login page
      return NextResponse.redirect(new URL("/login?logged_out=true", request.url), 303);
    }

    // Scenario C: Direct access to SLO URL without SAML parameters
    // Preserve session and redirect to account page
    return NextResponse.redirect(new URL("/account", request.url), 303);
  } catch (error) {
    console.error("Error processing SAML SLO request:", error);
    return NextResponse.redirect(new URL("/account", request.url), 303);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ auid: string }> }
) {
  const { auid } = await params;
  return handleSloRequest(request, auid, "GET");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ auid: string }> }
) {
  const { auid } = await params;
  return handleSloRequest(request, auid, "POST");
}
