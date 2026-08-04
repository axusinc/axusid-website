import "server-only";

import { decryptJson, encryptJson } from "@/lib/crypto/secret-box";

export type WrappedRefreshPayload = {
  auid: string;
  clientId: string;
  scopes: string[];
  backendRefreshToken: string;
  exp?: number;
};

export async function wrapRefreshToken(
  payload: WrappedRefreshPayload,
): Promise<string> {
  return encryptJson(payload);
}

export async function unwrapRefreshToken(
  token: string,
): Promise<WrappedRefreshPayload> {
  const data = await decryptJson<WrappedRefreshPayload>(token);

  if (
    !data.auid ||
    !data.clientId ||
    !Array.isArray(data.scopes) ||
    !data.backendRefreshToken
  ) {
    throw new Error("Invalid refresh token payload");
  }

  if (data.exp && data.exp <= Date.now()) {
    throw new Error("Refresh token has expired");
  }

  return data;
}
