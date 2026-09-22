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
  | "TOKEN_INVALID"
  | "NOT_AUTHORIZED"
  | "INVALID_CREDENTIALS"
  | "INVALID_PASSWORD"
  | "INVALID_EXTERNAL_IDENTITY"
  | "EXTERNAL_IDENTITY_ALREADY_LINKED"
  | "REGISTRATION_IDEMPOTENCY_CONFLICT"
  // Grant
  | "GRANT_NOT_FOUND"
  | "INVALID_GRANT_ACTIVATION_STATE"
  | "GRANT_APPROVAL_DENIED"
  // Rate limiting
  | "RATE_LIMITED"
  // Internal (rarely client-facing)
  | "INVALID_TOKEN_ID";

export const RATE_LIMIT_MESSAGE = "Too many requests. Please wait a moment and try again.";

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
  /** The engine does not know this token: it was revoked, or it never existed. */
  TOKEN_INVALID: "TOKEN_INVALID",
  NOT_AUTHORIZED: "NOT_AUTHORIZED",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  INVALID_PASSWORD: "INVALID_PASSWORD",
  INVALID_EXTERNAL_IDENTITY: "INVALID_EXTERNAL_IDENTITY",
  EXTERNAL_IDENTITY_ALREADY_LINKED: "EXTERNAL_IDENTITY_ALREADY_LINKED",
  REGISTRATION_IDEMPOTENCY_CONFLICT: "REGISTRATION_IDEMPOTENCY_CONFLICT",
  GRANT_NOT_FOUND: "GRANT_NOT_FOUND",
  INVALID_GRANT_ACTIVATION_STATE: "INVALID_GRANT_ACTIVATION_STATE",
  GRANT_APPROVAL_DENIED: "GRANT_APPROVAL_DENIED",
  RATE_LIMITED: "RATE_LIMITED",
  INVALID_TOKEN_ID: "INVALID_TOKEN_ID",
} as const satisfies Record<DomainErrorCode, DomainErrorCode>;

export interface GraphQlDomainError {
  message: string;
  extensions: {
    code: DomainErrorCode;
    groupCode?: DomainErrorGroupCode;
  };
}

export type ParsedDomainError = {
  message: string;
  code: DomainErrorCode;
  groupCode?: DomainErrorGroupCode;
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

    const isGroupValid = isDomainErrorGroupCode(groupCode);
    const isRateLimit = code === DOMAIN_ERROR_CODES.RATE_LIMITED || code === "RATE_LIMITED";

    if (
      !isDomainErrorCode(code) ||
      (!isGroupValid && !isRateLimit) ||
      typeof graphqlError.message !== "string"
    ) {
      return [];
    }

    return [
      {
        message: graphqlError.message,
        code,
        groupCode: isGroupValid ? groupCode : undefined,
      },
    ];
  });
}

export function getPrimaryDomainError(error: unknown): ParsedDomainError | null {
  return parseGraphqlDomainErrors(error)[0] ?? null;
}

export function isRateLimitError(error: unknown): boolean {
  if (getPrimaryDomainError(error)?.code === DOMAIN_ERROR_CODES.RATE_LIMITED) {
    return true;
  }

  if (isGraphqlClientError(error)) {
    if (error.response.status === 429) {
      return true;
    }
    const hasRateLimit = error.response.errors?.some((item) => {
      const code = item.extensions?.code;
      if (code === DOMAIN_ERROR_CODES.RATE_LIMITED || code === "RATE_LIMITED") {
        return true;
      }
      const msg = typeof item.message === "string" ? item.message.toLowerCase() : "";
      return msg.includes("too many requests") || msg.includes("rate limit");
    });
    if (hasRateLimit) {
      return true;
    }
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (
      msg.includes("too many requests") ||
      msg.includes("rate limit") ||
      msg.includes("429")
    ) {
      return true;
    }
  }

  return false;
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
  if (domainError.code === DOMAIN_ERROR_CODES.RATE_LIMITED) {
    return RATE_LIMIT_MESSAGE;
  }

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
  if (isRateLimitError(error)) {
    return RATE_LIMIT_MESSAGE;
  }

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

/**
 * Strictly "the engine does not know this token". Unlike isAuthError, this says the session is
 * over rather than that the action was refused, so it is safe to sign the account out on.
 */
export function isTokenInvalidError(error: unknown): boolean {
  if (isRateLimitError(error)) {
    return false;
  }

  if (getPrimaryDomainError(error)?.code === DOMAIN_ERROR_CODES.TOKEN_INVALID) {
    return true;
  }

  return (
    isGraphqlClientError(error) &&
    error.response.errors?.some(
      (item) => item.extensions?.code === DOMAIN_ERROR_CODES.TOKEN_INVALID,
    ) === true
  );
}

export function isAuthError(error: unknown): boolean {
  if (isRateLimitError(error)) {
    return false;
  }

  const domainError = getPrimaryDomainError(error);
  if (domainError) {
    if (
      domainError.code === DOMAIN_ERROR_CODES.NOT_AUTHORIZED ||
      domainError.code === DOMAIN_ERROR_CODES.TOKEN_REQUIRED ||
      domainError.code === DOMAIN_ERROR_CODES.TOKEN_INVALID ||
      domainError.code === DOMAIN_ERROR_CODES.INVALID_CREDENTIALS
    ) {
      return true;
    }
  }

  if (isGraphqlClientError(error)) {
    const msg = (error.response.errors?.[0]?.message ?? "").toLowerCase();
    const code = error.response.errors?.[0]?.extensions?.code;
    if (
      msg.includes("expired") ||
      msg.includes("invalid_grant") ||
      code === "NOT_AUTHORIZED" ||
      code === "TOKEN_REQUIRED" ||
      code === "TOKEN_INVALID" ||
      code === "INVALID_CREDENTIALS"
    ) {
      return true;
    }
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("expired") || msg.includes("invalid_grant")) {
      return true;
    }
  }

  return false;
}

