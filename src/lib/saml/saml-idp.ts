import "server-only";

import * as saml from "samlify";
import { getIssuer } from "@/lib/oauth/constants";

// Register a dummy schema validator to prevent samlify from throwing "no validation function found" errors
// which internally gets wrapped and thrown as ERR_INVALID_XML.
saml.setSchemaValidator({
  validate: () => Promise.resolve("skipped"),
});

function getSamlPrivateKeyPem(): string {
  const key = process.env.SAML_IDP_PRIVATE_KEY;
  if (!key) {
    throw new Error("SAML_IDP_PRIVATE_KEY is not configured");
  }
  return key.replace(/\\n/g, "\n");
}

function getSamlCertificatePem(): string {
  const cert = process.env.SAML_IDP_CERTIFICATE;
  if (!cert) {
    throw new Error("SAML_IDP_CERTIFICATE is not configured");
  }
  return cert.replace(/\\n/g, "\n");
}

export function createIdentityProvider(auid: string) {
  const baseUrl = getIssuer();
  const entityID = `${baseUrl}/saml/metadata/${auid}`;
  const ssoUrl = `${baseUrl}/saml/sso/${auid}`;

  return saml.IdentityProvider({
    entityID,
    singleSignOnService: [
      {
        Binding: "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect",
        Location: ssoUrl,
      },
      {
        Binding: "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST",
        Location: ssoUrl,
      },
    ],
    singleLogoutService: [
      {
        Binding: "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect",
        Location: `${baseUrl}/saml/slo/${auid}`,
      },
      {
        Binding: "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST",
        Location: `${baseUrl}/saml/slo/${auid}`,
      },
    ],
    privateKey: Buffer.from(getSamlPrivateKeyPem()),
    signingCert: Buffer.from(getSamlCertificatePem()),
    loginResponseTemplate: {
      context: `<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="{ID}" Version="2.0" IssueInstant="{IssueInstant}" Destination="{Destination}" InResponseTo="{InResponseTo}"><saml:Issuer>{Issuer}</saml:Issuer><samlp:Status><samlp:StatusCode Value="{StatusCode}"/></samlp:Status><saml:Assertion xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="{AssertionID}" Version="2.0" IssueInstant="{IssueInstant}"><saml:Issuer>{Issuer}</saml:Issuer><saml:Subject><saml:NameID Format="{NameIDFormat}">{NameID}</saml:NameID><saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer"><saml:SubjectConfirmationData NotOnOrAfter="{SubjectConfirmationDataNotOnOrAfter}" Recipient="{SubjectRecipient}" InResponseTo="{InResponseTo}"/></saml:SubjectConfirmation></saml:Subject><saml:Conditions NotBefore="{ConditionsNotBefore}" NotOnOrAfter="{ConditionsNotOnOrAfter}"><saml:AudienceRestriction><saml:Audience>{Audience}</saml:Audience></saml:AudienceRestriction></saml:Conditions>{AuthnStatement}{AttributeStatement}</saml:Assertion></samlp:Response>`,
      attributes: [
        { name: "auid", valueTag: "auid", nameFormat: "urn:oasis:names:tc:SAML:2.0:attrname-format:basic", valueXsiType: "xs:string" },
        { name: "sub", valueTag: "sub", nameFormat: "urn:oasis:names:tc:SAML:2.0:attrname-format:basic", valueXsiType: "xs:string" },
        { name: "email", valueTag: "email", nameFormat: "urn:oasis:names:tc:SAML:2.0:attrname-format:basic", valueXsiType: "xs:string" },
        { name: "username", valueTag: "username", nameFormat: "urn:oasis:names:tc:SAML:2.0:attrname-format:basic", valueXsiType: "xs:string" },
        { name: "firstName", valueTag: "firstName", nameFormat: "urn:oasis:names:tc:SAML:2.0:attrname-format:basic", valueXsiType: "xs:string" },
        { name: "lastName", valueTag: "lastName", nameFormat: "urn:oasis:names:tc:SAML:2.0:attrname-format:basic", valueXsiType: "xs:string" },
        { name: "displayName", valueTag: "displayName", nameFormat: "urn:oasis:names:tc:SAML:2.0:attrname-format:basic", valueXsiType: "xs:string" },
        { name: "variationId", valueTag: "variationId", nameFormat: "urn:oasis:names:tc:SAML:2.0:attrname-format:basic", valueXsiType: "xs:string" },
      ],
    },
  });
}

export function createServiceProvider(entityId: string, acsUrl: string, sloUrl?: string | null) {
  return saml.ServiceProvider({
    entityID: entityId,
    assertionConsumerService: [
      {
        Binding: "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST",
        Location: acsUrl,
      },
    ],
    singleLogoutService: sloUrl ? [
      {
        Binding: "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect",
        Location: sloUrl,
      },
      {
        Binding: "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST",
        Location: sloUrl,
      },
    ] : undefined,
  });
}

export type SamlRequestInfo = {
  id: string;
  issuer: string;
  assertionConsumerServiceURL?: string;
  destination?: string;
};

export async function parseSamlRequest(
  idp: saml.IdentityProviderInstance,
  sp: saml.ServiceProviderInstance,
  binding: "redirect" | "post",
  req: { query?: Record<string, string>; body?: Record<string, string> }
): Promise<SamlRequestInfo> {
  const parsed = await idp.parseLoginRequest(sp, binding, req);
  const extractRequest = parsed.extract?.request;
  if (!extractRequest) {
    throw new Error("Invalid SAML request structure");
  }

  const id = Array.isArray(extractRequest.id) ? extractRequest.id[0] : extractRequest.id;
  const issuer = Array.isArray(extractRequest.issuer) ? extractRequest.issuer[0] : extractRequest.issuer;
  const assertionConsumerServiceURL = Array.isArray(extractRequest.assertionConsumerServiceUrl)
    ? extractRequest.assertionConsumerServiceUrl[0]
    : extractRequest.assertionConsumerServiceUrl;
  const destination = Array.isArray(extractRequest.destination) ? extractRequest.destination[0] : extractRequest.destination;

  return {
    id: id || "",
    issuer: issuer || "",
    assertionConsumerServiceURL: assertionConsumerServiceURL || undefined,
    destination: destination || undefined,
  };
}

export type SamlUserAttributes = {
  auid: string;
  sub: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  displayName: string;
  variationId: string;
};

export async function createSamlResponse(
  idp: saml.IdentityProviderInstance,
  sp: saml.ServiceProviderInstance,
  requestInfo: SamlRequestInfo,
  user: SamlUserAttributes
): Promise<{ context: string; acsUrl: string }> {
  // Generate the assertion and response context.
  const response = await idp.createLoginResponse(
    sp,
    {
      extract: {
        request: {
          id: requestInfo.id,
          issuer: requestInfo.issuer,
          assertionConsumerServiceUrl: requestInfo.assertionConsumerServiceURL || sp.entityMeta.getAssertionConsumerService("post"),
          destination: requestInfo.destination || "",
        }
      }
    },
    "post",
    user,
    (templateContext: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const idpAny = idp as any;
      const id = idpAny.entitySetting.generateID();
      const assertionId = idpAny.entitySetting.generateID();
      const now = new Date();
      const nowStr = now.toISOString();
      const fiveMinsLater = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
      const rawDest = requestInfo.assertionConsumerServiceURL || sp.entityMeta.getAssertionConsumerService("post");
      const destination = (Array.isArray(rawDest) ? rawDest[0] : rawDest) || "";
      const audience = sp.entityMeta.getEntityID();
      const issuer = idp.entityMeta.getEntityID();
      const inResponseTo = requestInfo.id || "";

      // AuthnStatement
      const authnInstant = nowStr;
      const sessionIndex = assertionId;
      const authnStatement = `<saml:AuthnStatement AuthnInstant="${authnInstant}" SessionIndex="${sessionIndex}"><saml:AuthnContext><saml:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport</saml:AuthnContextClassRef></saml:AuthnContext></saml:AuthnStatement>`;

      // AttributeStatement
      const template = idpAny.entitySetting.loginResponseTemplate;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const samlLibAny = (saml as any).SamlLib;
      const attributeStatement = samlLibAny.attributeStatementBuilder(
        template.attributes,
        samlLibAny.defaultAttributeTemplate,
        samlLibAny.defaultAttributeStatementTemplate
      );

      // Replace tags in the template context:
      let xml = templateContext;
      xml = xml.replace(/{ID}/g, id);
      xml = xml.replace(/{AssertionID}/g, assertionId);
      xml = xml.replace(/{IssueInstant}/g, nowStr);
      xml = xml.replace(/{Destination}/g, destination);
      xml = xml.replace(/{InResponseTo}/g, inResponseTo);
      xml = xml.replace(/{Issuer}/g, issuer);
      xml = xml.replace(/{StatusCode}/g, "urn:oasis:names:tc:SAML:2.0:status:Success");
      xml = xml.replace(/{NameIDFormat}/g, "urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified");
      xml = xml.replace(/{NameID}/g, user.email || "");
      xml = xml.replace(/{SubjectConfirmationDataNotOnOrAfter}/g, fiveMinsLater);
      xml = xml.replace(/{SubjectRecipient}/g, destination);
      xml = xml.replace(/{ConditionsNotBefore}/g, nowStr);
      xml = xml.replace(/{ConditionsNotOnOrAfter}/g, fiveMinsLater);
      xml = xml.replace(/{Audience}/g, audience);
      xml = xml.replace(/{AuthnStatement}/g, authnStatement);
      xml = xml.replace(/{AttributeStatement}/g, attributeStatement);

      // Re-map attributes inside attributeStatement dynamically
      const userObj = user as unknown as Record<string, unknown>;
      for (const attr of template.attributes) {
        const valueTag = attr.valueTag;
        const tagName = `attr${valueTag.charAt(0).toUpperCase()}${valueTag.slice(1)}`;
        const tagRegex = new RegExp(`{${tagName}}`, "g");
        const val = userObj[valueTag] || "";
        xml = xml.replace(tagRegex, typeof val === "object" ? JSON.stringify(val) : String(val));
      }

      return { id, context: xml };
    }
  );

  return {
    context: response.context,
    acsUrl: (response as { entityEndpoint?: string }).entityEndpoint || "",
  };
}

export type SamlLogoutRequestInfo = {
  id: string;
  issuer: string;
  nameID: string;
  sessionIndex?: string;
  destination?: string;
};

export async function parseSamlLogoutRequest(
  idp: saml.IdentityProviderInstance,
  sp: saml.ServiceProviderInstance,
  binding: "redirect" | "post",
  req: { query?: Record<string, string>; body?: Record<string, string> }
): Promise<SamlLogoutRequestInfo> {
  const parsed = await idp.parseLogoutRequest(sp, binding, req);
  const extractRequest = parsed.extract?.request;
  if (!extractRequest) {
    throw new Error("Invalid SAML logout request structure");
  }

  const id = Array.isArray(extractRequest.id) ? extractRequest.id[0] : extractRequest.id;
  const issuer = Array.isArray(extractRequest.issuer) ? extractRequest.issuer[0] : extractRequest.issuer;
  const nameID = parsed.extract?.nameID || "";
  
  let sessionIndex: string | undefined;
  if (parsed.extract?.sessionIndex) {
    const rawIndex = parsed.extract.sessionIndex;
    if (Array.isArray(rawIndex)) {
      sessionIndex = rawIndex[0];
    } else if (typeof rawIndex === "object" && rawIndex !== null) {
      const idxObj = rawIndex as Record<string, unknown>;
      const val = idxObj._ || idxObj.sessionIndex;
      sessionIndex = typeof val === "string" ? val : undefined;
    } else {
      sessionIndex = String(rawIndex);
    }
  }

  const destination = Array.isArray(extractRequest.destination) ? extractRequest.destination[0] : extractRequest.destination;

  return {
    id: id || "",
    issuer: issuer || "",
    nameID: nameID || "",
    sessionIndex: sessionIndex || undefined,
    destination: destination || undefined,
  };
}

export type SamlLogoutResponseInfo = {
  id: string;
  issuer: string;
  destination?: string;
};

export async function parseSamlLogoutResponse(
  idp: saml.IdentityProviderInstance,
  sp: saml.ServiceProviderInstance,
  binding: "redirect" | "post",
  req: { query?: Record<string, string>; body?: Record<string, string> }
): Promise<SamlLogoutResponseInfo> {
  const parsed = await idp.parseLogoutResponse(sp, binding, req);
  const extractResponse = parsed.extract?.response;
  if (!extractResponse) {
    throw new Error("Invalid SAML logout response structure");
  }

  const id = Array.isArray(extractResponse.id) ? extractResponse.id[0] : extractResponse.id;
  const issuer = Array.isArray(extractResponse.issuer) ? extractResponse.issuer[0] : extractResponse.issuer;
  const destination = Array.isArray(extractResponse.destination) ? extractResponse.destination[0] : extractResponse.destination;

  return {
    id: id || "",
    issuer: issuer || "",
    destination: destination || undefined,
  };
}

export async function createSamlLogoutResponse(
  idp: saml.IdentityProviderInstance,
  sp: saml.ServiceProviderInstance,
  requestInfo: SamlLogoutRequestInfo,
  relayState?: string
): Promise<{ context: string; sloUrl: string }> {
  const response = await idp.createLogoutResponse(
    sp,
    {
      extract: {
        request: {
          id: requestInfo.id,
          issuer: requestInfo.issuer,
          destination: requestInfo.destination || "",
        }
      }
    },
    "redirect",
    relayState
  );
  return {
    context: response.context,
    sloUrl: (response as { entityEndpoint?: string }).entityEndpoint || "",
  };
}

export async function createSamlLogoutRequest(
  idp: saml.IdentityProviderInstance,
  sp: saml.ServiceProviderInstance,
  email: string,
  relayState?: string
): Promise<{ context: string; sloUrl: string }> {
  const response = idp.createLogoutRequest(
    sp,
    "redirect",
    {
      email,
      logoutNameID: email,
    },
    relayState
  );
  return {
    context: response.context,
    sloUrl: (response as { entityEndpoint?: string }).entityEndpoint || "",
  };
}
