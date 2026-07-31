import "server-only";

import type { getSdk } from "@/graphql/sdk";
import type { VariationsQuery } from "@/graphql/sdk";

type AuthSdk = ReturnType<typeof getSdk>;

export type UserProfileView = {
  identity: { auid: string };
  usernames: {
    auid: string;
    usernames: string[];
    defaultUsername: string;
  } | null;
  defaultVariation: { auid: string; variationId: string } | null;
};

export type UserProfileWithVariations = {
  user: UserProfileView;
  variations: VariationsQuery["variations"];
};

export type UserDisplayInfo = {
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  displayName: string;
};

export async function resolveUserDisplayInfo(
  sdk: AuthSdk,
  auid: string,
): Promise<UserDisplayInfo> {
  const { user, variations } = await fetchUserProfileWithVariations(sdk, auid);
  const username = user?.usernames?.defaultUsername ?? null;

  const defaultVariationId = user?.defaultVariation?.variationId;
  const defaultVariation = variations.find(
    (variation) => variation.id === defaultVariationId,
  );
  const firstName = defaultVariation?.firstName ?? null;
  const lastName = defaultVariation?.lastName ?? null;

  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  return {
    firstName,
    lastName,
    username,
    displayName: fullName || username || auid,
  };
}

export function formatSyntheticEmail(auid: string): string {
  return `${auid}@amail.com`;
}

export type AccountItemInfo = {
  auid: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  displayName: string;
  isActive: boolean;
};

export async function fetchAccountsDisplayInfo(
  sessions: { auid: string; credentials: any }[],
  activeAuid: string,
  sdkGetter: (credentials: any) => AuthSdk,
): Promise<AccountItemInfo[]> {
  const items = await Promise.all(
    sessions.map(async (sess) => {
      try {
        const sdk = sdkGetter(sess.credentials);
        const info = await resolveUserDisplayInfo(sdk, sess.auid);
        return {
          auid: sess.auid,
          firstName: info.firstName,
          lastName: info.lastName,
          username: info.username,
          displayName: info.displayName,
          isActive: sess.auid === activeAuid,
        };
      } catch {
        return {
          auid: sess.auid,
          firstName: null,
          lastName: null,
          username: null,
          displayName: sess.auid,
          isActive: sess.auid === activeAuid,
        };
      }
    }),
  );

  return items;
}

import { cache } from "react";

/**
 * Loads account profile data via granular queries. The backend `user` query
 * currently returns INTERNAL_ERROR, while usernames/defaultVariation/variations work.
 * Cached per request so multiple calls for the same user in a single request avoid redundant GraphQL roundtrips.
 */
export const fetchUserProfileWithVariations = cache(
  async (
    sdk: AuthSdk,
    auid: string,
  ): Promise<UserProfileWithVariations> => {
    const [{ usernames }, { defaultVariation }, { variations }] =
      await Promise.all([
        sdk.Usernames({ auid }),
        sdk.DefaultVariation({ auid }),
        sdk.Variations({ auid }),
      ]);

    return {
      user: {
        identity: { auid },
        usernames,
        defaultVariation,
      },
      variations,
    };
  },
);

