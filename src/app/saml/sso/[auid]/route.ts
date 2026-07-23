import { NextRequest, NextResponse } from "next/server";
import { getValidSession } from "@/lib/session-access";
import { getSamlConfigByAuid } from "@/lib/saml/saml-store";
import {
  createIdentityProvider,
  createServiceProvider,
  parseSamlRequest,
  createSamlResponse,
  type SamlUserAttributes,
} from "@/lib/saml/saml-idp";
import { getAuthSdkForSession } from "@/lib/auth-graphql";
import { fetchUserProfileWithVariations, resolveUserDisplayInfo } from "@/lib/user-profile";
import { getIssuer } from "@/lib/oauth/constants";

async function handleSsoRequest(
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
  let relayState: string = "";
  let sigAlg: string = "";
  let signature: string = "";

  if (method === "GET") {
    const searchParams = request.nextUrl.searchParams;
    samlRequest = searchParams.get("SAMLRequest");
    relayState = searchParams.get("RelayState") || "";
    sigAlg = searchParams.get("SigAlg") || "";
    signature = searchParams.get("Signature") || "";
  } else {
    try {
      const bodyText = await request.text();
      const bodyParams = new URLSearchParams(bodyText);
      samlRequest = bodyParams.get("SAMLRequest");
      relayState = bodyParams.get("RelayState") || "";
    } catch (e) {
      console.error("Failed to parse POST body in SAML SSO:", e);
    }
  }

  if (samlRequest) {
    // Restore spaces back to '+' in case the SP sent unencoded '+' characters
    samlRequest = samlRequest.replace(/ /g, "+");
  }

  if (!samlRequest) {
    return new NextResponse("Missing SAMLRequest parameter", {
      status: 400,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // 3. Verify user authentication
  const session = await getValidSession();
  
  // Reconstruct GET-equivalent current URL so that query/POST parameters (SAMLRequest/RelayState)
  // are preserved across login and consent redirects.
  let currentUrl = request.nextUrl.pathname;
  const searchParams = new URLSearchParams(request.nextUrl.search);
  if (method === "POST" && samlRequest) {
    searchParams.set("SAMLRequest", samlRequest);
    if (relayState) {
      searchParams.set("RelayState", relayState);
    }
    currentUrl += "?" + searchParams.toString();
  } else {
    currentUrl += request.nextUrl.search;
  }

  if (!session) {
    const loginUrl = new URL(`/login?redirect_uri=${encodeURIComponent(currentUrl)}`, request.url);
    return NextResponse.redirect(loginUrl, 303);
  }

  // Verify the logged-in user matches the target auidParam
  if (session.auid !== auidParam) {
    // Session user mismatch: redirect to login to switch accounts
    const loginUrl = new URL(`/login?redirect_uri=${encodeURIComponent(currentUrl)}`, request.url);
    return NextResponse.redirect(loginUrl, 303);
  }

  // Check if the user has consented to the SAML client config
  const hasConsented = session.consentedClients.includes(auidParam);
  if (!hasConsented) {
    const consentUrl = new URL(`/consent?redirect_uri=${encodeURIComponent(currentUrl)}`, request.url);
    return NextResponse.redirect(consentUrl, 303);
  }

  try {
    // 4. Initialize Samlify instances
    const idp = createIdentityProvider(auidParam);
    const sp = createServiceProvider(samlConfig.entityId, samlConfig.acsUrl);

    // 5. Parse and validate AuthnRequest
    const binding = method === "GET" ? "redirect" : "post";
    const reqParserObj = method === "GET" 
      ? { query: { SAMLRequest: samlRequest, RelayState: relayState, SigAlg: sigAlg, Signature: signature } }
      : { body: { SAMLRequest: samlRequest, RelayState: relayState } };

    const requestInfo = await parseSamlRequest(idp, sp, binding, reqParserObj);

    // 6. Fetch user profile variation details
    const sdk = getAuthSdkForSession(session);
    const { user, variations } = await fetchUserProfileWithVariations(sdk, session.auid);

    const defaultVariationId = user?.defaultVariation?.variationId;
    const defaultVariation = defaultVariationId
      ? (variations.find(v => v.id === defaultVariationId) ?? variations[0] ?? null)
      : (variations[0] ?? null);
    
    const username = user?.usernames?.defaultUsername || "user";
    const issuerUrl = new URL(getIssuer());
    const email = `${username}@${issuerUrl.hostname}`;

    const firstName = defaultVariation?.firstName || "";
    const lastName = defaultVariation?.lastName || "";
    const displayName = [firstName, lastName].filter(Boolean).join(" ") || username;

    const userAttributes: SamlUserAttributes = {
      auid: session.auid,
      sub: session.auid,
      email,
      username,
      firstName,
      lastName,
      displayName,
      variationId: defaultVariation?.id || "",
    };

    // Fetch the client/SAML config owner's profile details to resolve their app name dynamically
    let ownerInfo = null;
    try {
      ownerInfo = await resolveUserDisplayInfo(sdk, auidParam);
    } catch (e) {
      console.error("Failed to fetch SAML config owner profile:", e);
    }
    const appName = ownerInfo
      ? (ownerInfo.username ? `@${ownerInfo.username}` : ownerInfo.displayName)
      : (samlConfig.name || auidParam);

    // 7. Generate SAML Response Response
    const response = await createSamlResponse(idp, sp, requestInfo, userAttributes);

    // 8. Renders auto-submitting POST form back to SP's ACS URL
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>SAML SSO Redirect</title>
</head>
<body onload="document.forms[0].submit()">
  <p>Authenticating with ${escapeHtml(appName)}...</p>
  <form method="post" action="${escapeHtml(response.acsUrl)}">
    <input type="hidden" name="SAMLResponse" value="${escapeHtml(response.context)}" />
    ${relayState ? `<input type="hidden" name="RelayState" value="${escapeHtml(relayState)}" />` : ""}
    <noscript>
      <p>JavaScript is disabled. Click Submit to continue.</p>
      <input type="submit" value="Submit" />
    </noscript>
  </form>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error processing SAML SSO request:", error);
    return new NextResponse("Error processing SAML request", {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ auid: string }> }
) {
  const { auid } = await params;
  return handleSsoRequest(request, auid, "GET");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ auid: string }> }
) {
  const { auid } = await params;
  return handleSsoRequest(request, auid, "POST");
}
