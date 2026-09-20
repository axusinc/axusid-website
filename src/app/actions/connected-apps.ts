"use server";

import { revalidatePath } from "next/cache";
import { findGrantById, revokeGrant } from "@/lib/oauth/grants";
import { getValidSession } from "@/lib/session-access";

export type ConnectedAppActionState = { error?: string; success?: string };

/**
 * Disconnects an app: its native token is revoked at the engine, so calls it has already made
 * with it stop working, and its access and refresh tokens go with the authorization.
 */
export async function disconnectAppAction(
  _state: ConnectedAppActionState,
  formData: FormData,
): Promise<ConnectedAppActionState> {
  const grantId = String(formData.get("grantId") ?? "");
  if (!grantId) {
    return { error: "Missing application." };
  }

  const session = await getValidSession();
  if (!session) {
    return { error: "You are signed out. Sign in and try again." };
  }

  const grant = await findGrantById(grantId);
  // Only the user whose account it is may disconnect it; a grant id is not authority.
  if (!grant || grant.userAuid !== session.auid) {
    return { error: "That application is not connected to this account." };
  }

  await revokeGrant(grantId, "user");
  revalidatePath("/account");

  return { success: "Application disconnected." };
}
