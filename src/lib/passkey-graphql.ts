import "server-only";

import { getAuthSdk, type AuthCredentials } from "@/lib/auth-graphql";
import { wrapTokenWithBackend, refreshWithBackend } from "@/lib/oauth/adapter";
import { isGraphqlClientError } from "@/lib/graphql-errors";

export type PasskeyCredential = {
  id: string;
  credentialId: string;
  name?: string | null;
  transports?: string[];
  backupEligible?: boolean;
  backedUp?: boolean;
  createdAt: string;
  lastUsedAt?: string | null;
};

export type PasskeyEnrollmentResponse = {
  challengeId: string;
  optionsJson: string;
};

export type PasskeyLoginResponse = {
  challengeId: string;
  optionsJson: string;
};

export async function startPasskeyEnrollment(
  auid: string,
  displayName?: string,
  bearerToken?: string,
  tokenId?: string,
  rp?: string,
): Promise<PasskeyEnrollmentResponse> {
  const sdk = getAuthSdk(bearerToken);
  const data = await sdk.StartPasskeyRegistration({
    auid,
    displayName,
    tokenId,
    rp,
  });
  return data.startPasskeyRegistration;
}

export async function verifyPasskeyEnrollment(
  auid: string,
  challengeId: string,
  responseJson: string,
  name?: string,
  bearerToken?: string,
  tokenId?: string,
): Promise<boolean> {
  const sdk = getAuthSdk(bearerToken);
  const data = await sdk.FinishPasskeyRegistration({
    auid,
    challengeId,
    responseJson,
    name: name?.trim() || undefined,
    tokenId,
  });
  return data.finishPasskeyRegistration;
}

export async function startPasskeyLogin(
  permissions?: string[],
  rp?: string,
): Promise<PasskeyLoginResponse> {
  const sdk = getAuthSdk();
  const data = await sdk.StartPasskeyLogin({
    permissions: permissions && permissions.length > 0 ? permissions : undefined,
    rp,
  });
  return data.startPasskeyLogin;
}

export async function loginWithPasskey(
  challengeId: string,
  responseJson: string,
  fallbackAuid?: string,
): Promise<AuthCredentials & { auid: string }> {
  const sdk = getAuthSdk();
  const data = await sdk.LoginWithPasskey({ challengeId, responseJson });
  const resolvedAuid = data.loginWithPasskey.auid || fallbackAuid || "";
  return wrapTokenWithBackend(resolvedAuid, data.loginWithPasskey.id);
}

export async function getUserPasskeys(
  auid: string,
  bearerToken?: string,
  tokenId?: string,
  refreshToken?: string,
): Promise<PasskeyCredential[]> {
  let sdk = getAuthSdk(bearerToken);
  try {
    const data = await sdk.Passkeys({ auid, tokenId });
    return (data.passkeys ?? []).map((p) => ({
      id: p.credentialId,
      credentialId: p.credentialId,
      name: p.name ?? null,
      transports: p.transports ?? [],
      backupEligible: p.backupEligible,
      backedUp: p.backedUp,
      createdAt: p.createdAt,
      lastUsedAt: p.lastUsedAt ?? null,
    }));
  } catch (error) {
    if (refreshToken && isGraphqlClientError(error)) {
      const msg = error.response.errors?.[0]?.message ?? "";
      const code = error.response.errors?.[0]?.extensions?.code;
      if (msg.toLowerCase().includes("expired") || code === "INVALID_CREDENTIALS" || code === "NOT_AUTHORIZED") {
        try {
          const freshCredentials = await refreshWithBackend(refreshToken);
          sdk = getAuthSdk(freshCredentials.accessToken);
          const data = await sdk.Passkeys({ auid, tokenId });
          return (data.passkeys ?? []).map((p) => ({
            id: p.credentialId,
            credentialId: p.credentialId,
            name: p.name ?? null,
            transports: p.transports ?? [],
            backupEligible: p.backupEligible,
            backedUp: p.backedUp,
            createdAt: p.createdAt,
            lastUsedAt: p.lastUsedAt ?? null,
          }));
        } catch (refreshError) {
          console.error("[getUserPasskeys refresh error]:", refreshError);
        }
      }
    }
    console.error("[getUserPasskeys error]:", error);
    return [];
  }
}

export async function updatePasskeyName(
  auid: string,
  passkeyId: string,
  name: string,
  bearerToken?: string,
  tokenId?: string,
): Promise<boolean> {
  const sdk = getAuthSdk(bearerToken);
  try {
    const data = await sdk.UpdatePasskeyName({
      auid,
      credentialId: passkeyId,
      name,
      tokenId,
    });
    return data.updatePasskeyName;
  } catch (error) {
    console.error("[updatePasskeyName error]:", error);
    return false;
  }
}

export async function deletePasskey(
  auid: string,
  passkeyId: string,
  bearerToken?: string,
  tokenId?: string,
): Promise<boolean> {
  const sdk = getAuthSdk(bearerToken);
  try {
    const data = await sdk.DeletePasskey({
      auid,
      credentialId: passkeyId,
      tokenId,
    });
    return data.deletePasskey;
  } catch (error) {
    console.error("[deletePasskey error]:", error);
    return false;
  }
}
