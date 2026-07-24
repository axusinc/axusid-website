"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  validateRedirectUris,
  SUPPORTED_SCOPES,
} from "@/lib/oauth/constants";
import {
  deleteClient,
  saveOauthClient,
} from "@/lib/oauth/client-store";
import { requireDeveloperSession } from "@/lib/oauth/developer";

export type DeveloperActionState = {
  error?: string;
  success?: string;
};

function parseRedirectUris(raw: FormData): string[] {
  const value = String(raw.get("redirectUris") ?? "");
  return validateRedirectUris(value.split("\n"));
}

export async function deleteClientAction() {
  const session = await requireDeveloperSession();
  await deleteClient(session.auid, session.auid);
  revalidatePath("/account");
  revalidatePath("/developer/oauth/clients");
  redirect("/account?section=developer");
}

export async function saveOauthConfigAction(
  _prevState: DeveloperActionState,
  formData: FormData,
): Promise<DeveloperActionState> {
  const session = await requireDeveloperSession();

  try {
    const redirectUris = parseRedirectUris(formData);
    await saveOauthClient(session.auid, {
      redirectUris,
      allowedScopes: [...SUPPORTED_SCOPES],
    });

    revalidatePath("/account");
    revalidatePath("/developer/oauth/clients");
    return { success: "OAuth settings saved successfully." };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Unable to save OAuth settings.",
    };
  }
}
