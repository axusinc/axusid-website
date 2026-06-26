import type { AuthCredentials } from "@/lib/auth-graphql";

export type AuthorizationCodeRecord = {
  code: string;
  clientId: string;
  redirectUri: string;
  scopes: string[];
  auid: string;
  credentials: AuthCredentials;
  codeChallenge: string;
  codeChallengeMethod: "S256";
  expiresAt: number;
};

export type AuthorizationCodeStore = {
  save(record: AuthorizationCodeRecord): void;
  consume(code: string): AuthorizationCodeRecord | undefined;
  purgeExpired(): void;
};

class InMemoryAuthorizationCodeStore implements AuthorizationCodeStore {
  private readonly records = new Map<string, AuthorizationCodeRecord>();

  save(record: AuthorizationCodeRecord): void {
    this.purgeExpired();
    this.records.set(record.code, record);
  }

  consume(code: string): AuthorizationCodeRecord | undefined {
    this.purgeExpired();
    const record = this.records.get(code);
    if (!record) {
      return undefined;
    }

    this.records.delete(code);
    return record;
  }

  purgeExpired(): void {
    const now = Date.now();
    for (const [code, record] of this.records.entries()) {
      if (record.expiresAt <= now) {
        this.records.delete(code);
      }
    }
  }
}

const globalStore = globalThis as typeof globalThis & {
  __axusAuthCodeStore?: InMemoryAuthorizationCodeStore;
};

export function getAuthorizationCodeStore(): AuthorizationCodeStore {
  if (!globalStore.__axusAuthCodeStore) {
    globalStore.__axusAuthCodeStore = new InMemoryAuthorizationCodeStore();
  }

  return globalStore.__axusAuthCodeStore;
}

export const AUTH_CODE_TTL_MS = 5 * 60 * 1000;
