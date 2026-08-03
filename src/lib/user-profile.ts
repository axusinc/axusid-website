import "server-only";

import { cache } from "react";
import type { getSdk } from "@/graphql/sdk";
import type { VariationsQuery } from "@/graphql/sdk";
import type { AuthCredentials } from "@/lib/auth-graphql";
import {
  readNamePart,
  type ProfileName,
} from "@/lib/profile-name";

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
  variations: ProfileVariation[];
};

type BaseVariation = VariationsQuery["variations"][number];

export type ProfileVariation = BaseVariation & {
  name: ProfileName | null;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  status: string | null;
  description: string | null;
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
  const canonicalName = defaultVariation?.displayName?.trim() || null;

  return {
    firstName,
    lastName,
    username,
    displayName: canonicalName || username || auid,
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
  sessions: { auid: string; credentials: AuthCredentials }[],
  activeAuid: string,
  sdkGetter: (credentials: AuthCredentials) => AuthSdk,
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

async function hydrateVariation(
  sdk: AuthSdk,
  variation: BaseVariation,
): Promise<ProfileVariation> {
  const [nameResult, descriptionResult, statusResult] = await Promise.allSettled([
    sdk.Name({ variationId: variation.id }),
    sdk.Description({ variationId: variation.id }),
    sdk.Status({ variationId: variation.id }),
  ]);
  const name = nameResult.status === "fulfilled" ? nameResult.value.name : null;
  const description =
    descriptionResult.status === "fulfilled"
      ? descriptionResult.value.description
      : null;
  const status = statusResult.status === "fulfilled" ? statusResult.value.status : null;
  const profileName = name
    ? {
        displayName: name.displayName,
        elements: name.elements,
      }
    : null;
  const givenName = profileName ? readNamePart(profileName.elements, "GIVEN_NAME") : null;
  const familyName = profileName
    ? readNamePart(profileName.elements, "FAMILY_NAME")
    : null;

  return {
    ...variation,
    name: profileName,
    displayName: profileName?.displayName ?? null,
    firstName: givenName,
    lastName: familyName,
    status: status && !status.isExpired ? status.text : null,
    description: description?.text ?? null,
  };
}

/**
 * Loads account profile data via granular queries. The backend `user` query
 * currently returns INTERNAL_ERROR, while usernames/defaultVariation/variations work.
 * Cached per request so multiple calls for the same user in a single request avoid redundant GraphQL roundtrips.
 */
export const fetchUserProfileWithVariations = cache(
  async (
    sdk: AuthSdk,
    auid: string,
    retryCount = 3,
  ): Promise<UserProfileWithVariations> => {
    let usernames = null;
    let defaultVariation = null;
    let baseVariations: VariationsQuery["variations"] = [];

    for (let attempt = 0; attempt < retryCount; attempt++) {
      try {
        const [usernamesRes, defaultVarRes, variationsRes] = await Promise.allSettled([
          sdk.Usernames({ auid }),
          sdk.DefaultVariation({ auid }),
          sdk.Variations({ auid }),
        ]);

        if (usernamesRes.status === "fulfilled") {
          usernames = usernamesRes.value.usernames;
        }

        if (defaultVarRes.status === "fulfilled") {
          defaultVariation = defaultVarRes.value.defaultVariation;
        }

        if (variationsRes.status === "fulfilled") {
          baseVariations = variationsRes.value.variations ?? [];
        }

        if (defaultVariation || usernames || attempt === retryCount - 1) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch {
        if (attempt === retryCount - 1) break;
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    const variations = await Promise.all(
      baseVariations.map((variation) => hydrateVariation(sdk, variation)),
    );

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
