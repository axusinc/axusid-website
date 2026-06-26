import "server-only";

import { EncryptJWT, importPKCS8, importSPKI, SignJWT, jwtVerify, exportJWK } from "jose";
import { getIssuer } from "@/lib/oauth/constants";

function getPrivateKeyPem(): string {
  const key = process.env.OAUTH_JWT_PRIVATE_KEY;
  if (!key) {
    throw new Error("OAUTH_JWT_PRIVATE_KEY is not configured");
  }
  return key.replace(/\\n/g, "\n");
}

function getPublicKeyPem(): string {
  const key = process.env.OAUTH_JWT_PUBLIC_KEY;
  if (!key) {
    throw new Error("OAUTH_JWT_PUBLIC_KEY is not configured");
  }
  return key.replace(/\\n/g, "\n");
}

let privateKeyPromise: ReturnType<typeof importPKCS8> | undefined;
let publicKeyPromise: ReturnType<typeof importSPKI> | undefined;

async function getPrivateKey() {
  if (!privateKeyPromise) {
    privateKeyPromise = importPKCS8(getPrivateKeyPem(), "RS256");
  }
  return privateKeyPromise;
}

async function getPublicKey() {
  if (!publicKeyPromise) {
    publicKeyPromise = importSPKI(getPublicKeyPem(), "RS256");
  }
  return publicKeyPromise;
}

export type AccessTokenClaims = {
  sub: string;
  aud: string;
  scope: string;
};

export async function signAccessToken(params: {
  sub: string;
  aud: string;
  scope: string;
  expiresInSeconds: number;
}): Promise<string> {
  const key = await getPrivateKey();
  return new SignJWT({
    scope: params.scope,
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(getIssuer())
    .setSubject(params.sub)
    .setAudience(params.aud)
    .setIssuedAt()
    .setExpirationTime(`${params.expiresInSeconds}s`)
    .sign(key);
}

export async function signIdToken(params: {
  sub: string;
  aud: string;
  expiresInSeconds: number;
  claims: Record<string, unknown>;
}): Promise<string> {
  const key = await getPrivateKey();
  return new SignJWT(params.claims)
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(getIssuer())
    .setSubject(params.sub)
    .setAudience(params.aud)
    .setIssuedAt()
    .setExpirationTime(`${params.expiresInSeconds}s`)
    .sign(key);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenClaims> {
  const key = await getPublicKey();
  const { payload } = await jwtVerify(token, key, {
    issuer: getIssuer(),
  });

  if (!payload.sub || typeof payload.sub !== "string") {
    throw new Error("Invalid access token subject");
  }

  if (!payload.aud) {
    throw new Error("Invalid access token audience");
  }

  const aud = Array.isArray(payload.aud) ? payload.aud[0] : payload.aud;
  if (typeof aud !== "string") {
    throw new Error("Invalid access token audience");
  }

  return {
    sub: payload.sub,
    aud,
    scope: typeof payload.scope === "string" ? payload.scope : "",
  };
}

export async function exportJwks() {
  const key = await getPublicKey();
  const jwk = await exportJWK(key);
  return {
    keys: [
      {
        ...jwk,
        use: "sig",
        alg: "RS256",
        kid: "axusid-oauth-rs256",
      },
    ],
  };
}
