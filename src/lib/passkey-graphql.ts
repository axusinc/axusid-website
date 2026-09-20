import "server-only";

import { getAuthSdk } from "@/lib/auth-graphql";

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
  relyingPartyId: string,
  displayName: string | undefined,
  tokenId: string,
): Promise<PasskeyEnrollmentResponse> {
  const sdk = getAuthSdk(tokenId);
  const data = await sdk.StartPasskeyRegistration({
    auid,
    displayName,
    relyingPartyId,
  });
  return data.startPasskeyRegistration;
}

export async function verifyPasskeyEnrollment(
  auid: string,
  challengeId: string,
  responseJson: string,
  name: string | undefined,
  tokenId: string,
): Promise<boolean> {
  const sdk = getAuthSdk(tokenId);
  const data = await sdk.FinishPasskeyRegistration({
    auid,
    challengeId,
    responseJson,
    name: name?.trim() || undefined,
  });
  return data.finishPasskeyRegistration;
}

export async function startPasskeyLogin(
  relyingPartyId: string,
  permissions?: string[],
): Promise<PasskeyLoginResponse> {
  const sdk = getAuthSdk();
  const data = await sdk.StartPasskeyLogin({
    permissions: permissions && permissions.length > 0 ? permissions : undefined,
    relyingPartyId,
  });
  return data.startPasskeyLogin;
}

export async function loginWithPasskey(
  challengeId: string,
  responseJson: string,
  fallbackAuid?: string,
): Promise<{ auid: string; tokenId: string }> {
  const sdk = getAuthSdk();
  const data = await sdk.LoginWithPasskey({ challengeId, responseJson });
  return {
    auid: data.loginWithPasskey.auid || fallbackAuid || "",
    tokenId: data.loginWithPasskey.id,
  };
}

export async function getUserPasskeys(
  auid: string,
  tokenId: string,
): Promise<PasskeyCredential[]> {
  const sdk = getAuthSdk(tokenId);
  try {
    const data = await sdk.Passkeys({ auid });
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
    console.error("[getUserPasskeys error]:", error);
    return [];
  }
}

export async function updatePasskeyName(
  auid: string,
  passkeyId: string,
  name: string,
  tokenId: string,
): Promise<boolean> {
  const sdk = getAuthSdk(tokenId);
  try {
    const data = await sdk.UpdatePasskeyName({
      auid,
      credentialId: passkeyId,
      name,
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
  tokenId: string,
): Promise<boolean> {
  const sdk = getAuthSdk(tokenId);
  try {
    const data = await sdk.DeletePasskey({
      auid,
      credentialId: passkeyId,
    });
    return data.deletePasskey;
  } catch (error) {
    console.error("[deletePasskey error]:", error);
    return false;
  }
}
