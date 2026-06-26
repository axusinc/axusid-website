import "server-only";

import { getAuthSdk } from "@/lib/auth-graphql";
import { fetchUserProfileWithVariations } from "@/lib/user-profile";

export type OidcClaims = Record<string, string | undefined>;

function formatAuid(auid: string): string {
  return auid;
}

export async function fetchProfileClaims(
  auid: string,
  bearerToken?: string,
): Promise<OidcClaims> {
  const sdk = getAuthSdk(bearerToken);
  const { user, variations } = await fetchUserProfileWithVariations(sdk, auid);

  const defaultVariationId = user?.defaultVariation?.variationId;
  const defaultVariation = variations.find(
    (variation) => variation.id === defaultVariationId,
  );

  const givenName = defaultVariation?.firstName ?? undefined;
  const familyName = defaultVariation?.lastName ?? undefined;
  const name = [givenName, familyName].filter(Boolean).join(" ") || undefined;

  return {
    sub: formatAuid(auid),
    preferred_username: user?.usernames?.defaultUsername,
    name,
    given_name: givenName ?? undefined,
    family_name: familyName ?? undefined,
  };
}

export function filterClaimsByScope(
  claims: OidcClaims,
  scopes: string[],
): OidcClaims {
  const result: OidcClaims = {};

  if (scopes.includes("openid")) {
    result.sub = claims.sub;
  }

  if (scopes.includes("profile")) {
    result.preferred_username = claims.preferred_username;
    result.name = claims.name;
    result.given_name = claims.given_name;
    result.family_name = claims.family_name;
  }

  if (scopes.includes("email")) {
    // Backend does not expose email yet.
  }

  return result;
}

export async function buildOidcClaims(
  auid: string,
  bearerToken: string,
  scopes: string[],
): Promise<OidcClaims> {
  const profileClaims = await fetchProfileClaims(auid, bearerToken);
  return filterClaimsByScope(profileClaims, scopes);
}
