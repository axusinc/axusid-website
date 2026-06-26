import "server-only";

import { ClientError } from "graphql-request";

export type DomainErrorGroupCode =
  | "INVALID_ARGUMENT"
  | "NOT_FOUND"
  | "DUPLICATE";

export type DomainErrorCode =
  // AUID
  | "EMPTY_AUID"
  | "NEGATIVE_AUID_COMPONENT"
  | "INVALID_AUID_FORMAT"
  // Identity
  | "INVALID_IDENTITY_ID"
  | "IDENTITY_NOT_FOUND"
  // Usernames
  | "INVALID_USERNAME"
  | "USERNAME_ALREADY_EXISTS"
  | "USERNAME_NOT_FOUND"
  | "USERNAMES_NOT_FOUND"
  // Variation
  | "VARIATION_NOT_FOUND"
  | "INVALID_VARIATION_OWNER"
  | "INVALID_VARIATION_ID_FORMAT"
  | "DEFAULT_VARIATION_NOT_FOUND"
  // Auth
  | "TOKEN_REQUIRED"
  | "NOT_AUTHORIZED"
  | "INVALID_CREDENTIALS"
  | "INVALID_PASSWORD"
  // Grant
  | "GRANT_NOT_FOUND"
  | "INVALID_GRANT_ACTIVATION_STATE"
  | "GRANT_APPROVAL_DENIED"
  // Internal (rarely client-facing)
  | "INVALID_TOKEN_ID"
  | "INVALID_ACCESS_CREDENTIAL_ID"
  | "INVALID_REFRESH_CREDENTIAL_ID";

export const DOMAIN_ERROR_CODES = {
  EMPTY_AUID: "EMPTY_AUID",
  NEGATIVE_AUID_COMPONENT: "NEGATIVE_AUID_COMPONENT",
  INVALID_AUID_FORMAT: "INVALID_AUID_FORMAT",
  INVALID_IDENTITY_ID: "INVALID_IDENTITY_ID",
  IDENTITY_NOT_FOUND: "IDENTITY_NOT_FOUND",
  INVALID_USERNAME: "INVALID_USERNAME",
  USERNAME_ALREADY_EXISTS: "USERNAME_ALREADY_EXISTS",
  USERNAME_NOT_FOUND: "USERNAME_NOT_FOUND",
  USERNAMES_NOT_FOUND: "USERNAMES_NOT_FOUND",
  VARIATION_NOT_FOUND: "VARIATION_NOT_FOUND",
  INVALID_VARIATION_OWNER: "INVALID_VARIATION_OWNER",
  INVALID_VARIATION_ID_FORMAT: "INVALID_VARIATION_ID_FORMAT",
  DEFAULT_VARIATION_NOT_FOUND: "DEFAULT_VARIATION_NOT_FOUND",
  TOKEN_REQUIRED: "TOKEN_REQUIRED",
  NOT_AUTHORIZED: "NOT_AUTHORIZED",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  INVALID_PASSWORD: "INVALID_PASSWORD",
  GRANT_NOT_FOUND: "GRANT_NOT_FOUND",
  INVALID_GRANT_ACTIVATION_STATE: "INVALID_GRANT_ACTIVATION_STATE",
  GRANT_APPROVAL_DENIED: "GRANT_APPROVAL_DENIED",
  INVALID_TOKEN_ID: "INVALID_TOKEN_ID",
  INVALID_ACCESS_CREDENTIAL_ID: "INVALID_ACCESS_CREDENTIAL_ID",
  INVALID_REFRESH_CREDENTIAL_ID: "INVALID_REFRESH_CREDENTIAL_ID",
} as const satisfies Record<DomainErrorCode, DomainErrorCode>;

export interface GraphQlDomainError {
  message: string;
  extensions: {
    code: DomainErrorCode;
    groupCode: DomainErrorGroupCode;
  };
}

export type ParsedDomainError = {
  message: string;
  code: DomainErrorCode;
  groupCode: DomainErrorGroupCode;
};

export type GraphqlErrorContext =
  | "login"
  | "oauth-refresh"
  | "oauth"
  | "account";

const DOMAIN_ERROR_CODES_SET = new Set<string>(Object.values(DOMAIN_ERROR_CODES));

const DOMAIN_ERROR_GROUP_CODES: DomainErrorGroupCode[] = [
  "INVALID_ARGUMENT",
  "NOT_FOUND",
  "DUPLICATE",
];

function isDomainErrorCode(value: unknown): value is DomainErrorCode {
  return typeof value === "string" && DOMAIN_ERROR_CODES_SET.has(value);
}

function isDomainErrorGroupCode(value: unknown): value is DomainErrorGroupCode {
  return (
    typeof value === "string" &&
    DOMAIN_ERROR_GROUP_CODES.includes(value as DomainErrorGroupCode)
  );
}

export function isGraphqlClientError(error: unknown): error is ClientError {
  return error instanceof ClientError;
}

export function parseGraphqlDomainErrors(error: unknown): ParsedDomainError[] {
  if (!isGraphqlClientError(error)) {
    return [];
  }

  return (error.response.errors ?? []).flatMap((graphqlError) => {
    const extensions = graphqlError.extensions;
    const code = extensions?.code;
    const groupCode = extensions?.groupCode;

    if (
      !isDomainErrorCode(code) ||
      !isDomainErrorGroupCode(groupCode) ||
      typeof graphqlError.message !== "string"
    ) {
      return [];
    }

    return [
      {
        message: graphqlError.message,
        code,
        groupCode,
      },
    ];
  });
}

export function getPrimaryDomainError(error: unknown): ParsedDomainError | null {
  return parseGraphqlDomainErrors(error)[0] ?? null;
}

function formatLoginError(domainError: ParsedDomainError): string {
  switch (domainError.code) {
    case DOMAIN_ERROR_CODES.INVALID_CREDENTIALS:
    case DOMAIN_ERROR_CODES.INVALID_PASSWORD:
      return "Invalid username or password.";
    case DOMAIN_ERROR_CODES.IDENTITY_NOT_FOUND:
    case DOMAIN_ERROR_CODES.USERNAME_NOT_FOUND:
    case DOMAIN_ERROR_CODES.USERNAMES_NOT_FOUND:
      return "Unknown username.";
    case DOMAIN_ERROR_CODES.NOT_AUTHORIZED:
    case DOMAIN_ERROR_CODES.TOKEN_REQUIRED:
      return "Unable to sign in. Try again.";
    default:
      return domainError.message;
  }
}

function formatOauthRefreshError(domainError: ParsedDomainError): string {
  if (domainError.code === DOMAIN_ERROR_CODES.INVALID_CREDENTIALS) {
    return "Refresh token is invalid or expired.";
  }

  return domainError.message;
}

function formatAccountError(domainError: ParsedDomainError): string {
  if (domainError.code === DOMAIN_ERROR_CODES.IDENTITY_NOT_FOUND) {
    return "Account not found.";
  }

  return domainError.message;
}

function formatByContext(
  domainError: ParsedDomainError,
  context?: GraphqlErrorContext,
): string {
  switch (context) {
    case "login":
      return formatLoginError(domainError);
    case "oauth-refresh":
      return formatOauthRefreshError(domainError);
    case "oauth":
      return domainError.message;
    case "account":
      return formatAccountError(domainError);
    default:
      return domainError.message;
  }
}

export function formatGraphqlError(
  error: unknown,
  context?: GraphqlErrorContext,
  fallback = "Something went wrong. Try again.",
): string {
  const domainError = getPrimaryDomainError(error);
  if (domainError) {
    return formatByContext(domainError, context);
  }

  if (isGraphqlClientError(error)) {
    const message = error.response.errors?.[0]?.message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }

  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return fallback;
}
