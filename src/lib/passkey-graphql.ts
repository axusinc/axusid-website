import "server-only";

import gql from "graphql-tag";
import { createAuthGraphqlClient, type AuthCredentials } from "@/lib/auth-graphql";
import { wrapTokenWithBackend } from "@/lib/oauth/adapter";

export type PasskeyCredential = {
  id: string;
  name: string | null;
  createdAt: string;
};

export type PasskeyEnrollmentResponse = {
  challengeId: string;
  optionsJson: string;
};

export type PasskeyLoginResponse = {
  challengeId: string;
  optionsJson: string;
};

const START_PASSKEY_REGISTRATION = gql`
  mutation StartPasskeyRegistration($auid: ID!, $tokenId: String, $displayName: String) {
    startPasskeyRegistration(auid: $auid, tokenId: $tokenId, displayName: $displayName) {
      challengeId
      optionsJson
    }
  }
`;

const FINISH_PASSKEY_REGISTRATION = gql`
  mutation FinishPasskeyRegistration($auid: ID!, $tokenId: String, $challengeId: ID!, $responseJson: String!) {
    finishPasskeyRegistration(auid: $auid, tokenId: $tokenId, challengeId: $challengeId, responseJson: $responseJson)
  }
`;

const START_PASSKEY_LOGIN = gql`
  mutation StartPasskeyLogin($permissions: [String!]) {
    startPasskeyLogin(permissions: $permissions) {
      challengeId
      optionsJson
    }
  }
`;

const LOGIN_WITH_PASSKEY = gql`
  mutation LoginWithPasskey($challengeId: ID!, $responseJson: String!) {
    loginWithPasskey(challengeId: $challengeId, responseJson: $responseJson) {
      id
      auid
    }
  }
`;

const PASSKEYS_QUERY = gql`
  query Passkeys($auid: ID!) {
    passkeys(auid: $auid) {
      id
      name
      createdAt
    }
  }
`;

const DELETE_PASSKEY = gql`
  mutation DeletePasskey($auid: ID!, $tokenId: String, $passkeyId: ID!) {
    deletePasskey(auid: $auid, tokenId: $tokenId, passkeyId: $passkeyId)
  }
`;

export async function startPasskeyEnrollment(
  auid: string,
  displayName?: string,
  bearerToken?: string,
): Promise<PasskeyEnrollmentResponse> {
  const client = createAuthGraphqlClient(bearerToken);
  const data = await client.request<{ startPasskeyRegistration: PasskeyEnrollmentResponse }>(
    START_PASSKEY_REGISTRATION,
    { auid, displayName },
  );
  return data.startPasskeyRegistration;
}

export async function verifyPasskeyEnrollment(
  auid: string,
  challengeId: string,
  responseJson: string,
  bearerToken?: string,
): Promise<boolean> {
  const client = createAuthGraphqlClient(bearerToken);
  const data = await client.request<{ finishPasskeyRegistration: boolean }>(
    FINISH_PASSKEY_REGISTRATION,
    { auid, challengeId, responseJson },
  );
  return data.finishPasskeyRegistration;
}

export async function startPasskeyLogin(
  permissions?: string[],
): Promise<PasskeyLoginResponse> {
  const client = createAuthGraphqlClient();
  const data = await client.request<{ startPasskeyLogin: PasskeyLoginResponse }>(
    START_PASSKEY_LOGIN,
    { permissions: permissions && permissions.length > 0 ? permissions : undefined },
  );
  return data.startPasskeyLogin;
}

export async function loginWithPasskey(
  challengeId: string,
  responseJson: string,
  fallbackAuid?: string,
): Promise<AuthCredentials & { auid: string }> {
  const client = createAuthGraphqlClient();
  const data = await client.request<{ loginWithPasskey: { id: string; auid?: string } }>(
    LOGIN_WITH_PASSKEY,
    { challengeId, responseJson },
  );
  const resolvedAuid = data.loginWithPasskey.auid || fallbackAuid || "";
  return wrapTokenWithBackend(resolvedAuid, data.loginWithPasskey.id);
}

export async function getUserPasskeys(
  auid: string,
  bearerToken?: string,
): Promise<PasskeyCredential[]> {
  const client = createAuthGraphqlClient(bearerToken);
  try {
    const data = await client.request<{ passkeys: PasskeyCredential[] }>(
      PASSKEYS_QUERY,
      { auid },
    );
    return data.passkeys ?? [];
  } catch {
    return [];
  }
}

export async function deletePasskey(
  auid: string,
  passkeyId: string,
  bearerToken?: string,
): Promise<boolean> {
  const client = createAuthGraphqlClient(bearerToken);
  try {
    const data = await client.request<{ deletePasskey: boolean }>(
      DELETE_PASSKEY,
      { auid, passkeyId },
    );
    return data.deletePasskey;
  } catch {
    return true;
  }
}
