"use server";

import { revalidatePath } from "next/cache";
import { opaqueGraphqlBearer } from "@/lib/auth-graphql";
import { formatGraphqlError } from "@/lib/graphql-errors";
import { getValidSession } from "@/lib/session-access";
import { unlinkExternalIdentity } from "@/lib/google-oauth";

export type ExternalIdentityActionState = {
  error?: string;
  success?: string;
};

export async function unlinkExternalIdentityAction(
  externalIdentityId: string,
): Promise<ExternalIdentityActionState> {
  const session = await getValidSession();
  if (!session) {
    return { error: "Your session has expired. Sign in again." };
  }

  try {
    const bearer = opaqueGraphqlBearer(session.credentials);
    const unlinked = await unlinkExternalIdentity(session.auid, externalIdentityId, bearer);
    if (!unlinked) {
      return {
        error:
          "This sign-in method cannot be disconnected. Add another way to sign in first.",
      };
    }

    revalidatePath("/account");
    return { success: "Google account disconnected successfully." };
  } catch (error) {
    return {
      error: formatGraphqlError(error, undefined, "Unable to disconnect Google account."),
    };
  }
}
