/**
 * Helper functions for WebAuthn / Passkey client-side authentication and enrollment.
 */

// Convert base64 / base64url string to Uint8Array safely
export function base64UrlToBuffer(base64url?: string | null): Uint8Array {
  if (!base64url) {
    return new Uint8Array(0);
  }
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (base64.length % 4)) % 4;
  const padded = base64 + "=".repeat(padLen);
  const binary = atob(padded);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    buffer[i] = binary.charCodeAt(i);
  }
  return buffer;
}

// Convert ArrayBuffer to base64url string safely
export function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export type PasskeyRegistrationOptions = {
  challenge: string;
  rp?: {
    name: string;
    id?: string;
  };
  user?: {
    id: string;
    name: string;
    displayName: string;
  };
  pubKeyCredParams?: Array<{
    type: "public-key";
    alg: number;
  }>;
  timeout?: number;
  attestation?: AttestationConveyancePreference;
  authenticatorSelection?: AuthenticatorSelectionCriteria;
  excludeCredentials?: Array<{
    id: string;
    type: "public-key";
    transports?: AuthenticatorTransport[];
  }>;
};

export type PasskeyAuthenticationOptions = {
  challenge: string;
  timeout?: number;
  rpId?: string;
  allowCredentials?: Array<{
    id: string;
    type: "public-key";
    transports?: AuthenticatorTransport[];
  }>;
  userVerification?: UserVerificationRequirement;
};

export type PasskeyAccountName = {
  name: string;
  displayName?: string;
};

function getValidRpId(backendRpId?: string): string | undefined {
  if (typeof window === "undefined") return backendRpId;
  const currentHost = window.location.hostname;
  if (!backendRpId) return currentHost;

  const isMatch =
    currentHost === backendRpId ||
    currentHost.endsWith("." + backendRpId);

  return isMatch ? backendRpId : currentHost;
}

/**
 * Executes browser WebAuthn passkey registration (creation).
 */
export async function createPasskeyCredential(
  options: PasskeyRegistrationOptions | string | Record<string, unknown>,
  accountName?: PasskeyAccountName,
) {
  if (typeof window === "undefined" || !navigator.credentials || !navigator.credentials.create) {
    throw new Error("Passkeys/WebAuthn are not supported in this browser.");
  }

  const rawParsed: Record<string, unknown> =
    typeof options === "string" ? JSON.parse(options) : options;

  // Standard WebAuthn JSON may nest options inside { publicKey: { ... } }
  const parsedOptions: PasskeyRegistrationOptions =
    (rawParsed.publicKey as PasskeyRegistrationOptions) ??
    (rawParsed as PasskeyRegistrationOptions);

  if (!parsedOptions.challenge) {
    throw new Error("Invalid passkey registration options: missing challenge.");
  }

  const challengeBuffer = base64UrlToBuffer(parsedOptions.challenge);
  const rpId = getValidRpId(parsedOptions.rp?.id);

  const publicKey: PublicKeyCredentialCreationOptions = {
    challenge: challengeBuffer.buffer as ArrayBuffer,
    rp: {
      name: parsedOptions.rp?.name ?? "AXUS ID",
      ...(rpId ? { id: rpId } : {}),
    },
    user: {
      id: parsedOptions.user?.id
        ? base64UrlToBuffer(parsedOptions.user.id).buffer as ArrayBuffer
        : new Uint8Array([1, 2, 3, 4]).buffer as ArrayBuffer,
      name: accountName?.name ?? parsedOptions.user?.name ?? "user",
      displayName:
        accountName?.displayName ??
        accountName?.name ??
        parsedOptions.user?.displayName ??
        "AXUS ID User",
    },
    pubKeyCredParams: parsedOptions.pubKeyCredParams ?? [
      { type: "public-key", alg: -7 }, // ES256
      { type: "public-key", alg: -257 }, // RS256
    ],
    timeout: parsedOptions.timeout ?? 60000,
    attestation: parsedOptions.attestation ?? "none",
    authenticatorSelection: parsedOptions.authenticatorSelection ?? {
      userVerification: "preferred",
      residentKey: "preferred",
    },
    excludeCredentials: parsedOptions.excludeCredentials?.map((cred) => ({
      id: base64UrlToBuffer(cred.id).buffer as ArrayBuffer,
      type: "public-key",
      transports: cred.transports,
    })),
  };

  const credential = (await navigator.credentials.create({
    publicKey,
  })) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error("Failed to create passkey credential.");
  }

  const response = credential.response as AuthenticatorAttestationResponse;

  return {
    id: credential.id,
    rawId: bufferToBase64Url(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: bufferToBase64Url(response.clientDataJSON),
      attestationObject: bufferToBase64Url(response.attestationObject),
      transports: response.getTransports ? response.getTransports() : [],
    },
    clientExtensionResults: credential.getClientExtensionResults
      ? credential.getClientExtensionResults()
      : {},
    authenticatorAttachment: (credential as unknown as Record<string, unknown>).authenticatorAttachment ?? undefined,
  };
}

/**
 * Executes browser WebAuthn passkey assertion (login).
 */
export async function getPasskeyCredential(
  options: PasskeyAuthenticationOptions | string | Record<string, unknown>,
) {
  if (typeof window === "undefined" || !navigator.credentials || !navigator.credentials.get) {
    throw new Error("Passkeys/WebAuthn are not supported in this browser.");
  }

  const rawParsed: Record<string, unknown> =
    typeof options === "string" ? JSON.parse(options) : options;

  // Standard WebAuthn JSON may nest options inside { publicKey: { ... } }
  const parsedOptions: PasskeyAuthenticationOptions =
    (rawParsed.publicKey as PasskeyAuthenticationOptions) ??
    (rawParsed as PasskeyAuthenticationOptions);

  if (!parsedOptions.challenge) {
    throw new Error("Invalid passkey authentication options: missing challenge.");
  }

  const challengeBuffer = base64UrlToBuffer(parsedOptions.challenge);
  const rpId = getValidRpId(parsedOptions.rpId);

  const publicKey: PublicKeyCredentialRequestOptions = {
    challenge: challengeBuffer.buffer as ArrayBuffer,
    timeout: parsedOptions.timeout ?? 60000,
    ...(rpId ? { rpId } : {}),
    userVerification: parsedOptions.userVerification ?? "preferred",
    allowCredentials: parsedOptions.allowCredentials?.map((cred) => ({
      id: base64UrlToBuffer(cred.id).buffer as ArrayBuffer,
      type: "public-key",
      transports: cred.transports,
    })),
  };

  const credential = (await navigator.credentials.get({
    publicKey,
  })) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error("Failed to authenticate with passkey.");
  }

  const response = credential.response as AuthenticatorAssertionResponse;

  return {
    id: credential.id,
    rawId: bufferToBase64Url(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: bufferToBase64Url(response.clientDataJSON),
      authenticatorData: bufferToBase64Url(response.authenticatorData),
      signature: bufferToBase64Url(response.signature),
      ...(response.userHandle && response.userHandle.byteLength > 0
        ? { userHandle: bufferToBase64Url(response.userHandle) }
        : {}),
    },
    clientExtensionResults: credential.getClientExtensionResults
      ? credential.getClientExtensionResults()
      : {},
    authenticatorAttachment: (credential as unknown as Record<string, unknown>).authenticatorAttachment ?? undefined,
  };
}
