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

/**
 * Loads account profile data via granular queries. The backend `user` query
 * currently returns INTERNAL_ERROR, while usernames/defaultVariation/variations work.
 */
export async function fetchUserProfileWithVariations(
  sdk: AuthSdk,
  auid: string,
): Promise<UserProfileWithVariations> {
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
}
