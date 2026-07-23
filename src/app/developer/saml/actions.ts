"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireDeveloperSession } from "@/lib/oauth/developer";
import { upsertSamlConfig, deleteSamlConfig } from "@/lib/saml/saml-store";
import { getAuthSdkForSession } from "@/lib/auth-graphql";
import { resolveUserDisplayInfo } from "@/lib/user-profile";

export type SamlActionState = {
  error?: string;
  success?: string;
};

export async function saveSamlConfigAction(
  _prevState: SamlActionState,
  formData: FormData,
): Promise<SamlActionState> {
  const session = await requireDeveloperSession();
  const entityId = String(formData.get("entityId") ?? "").trim();
  const acsUrl = String(formData.get("acsUrl") ?? "").trim();
  const sloUrl = String(formData.get("sloUrl") ?? "").trim();

  if (!entityId || !acsUrl) {
    return { error: "All fields (Entity ID, ACS URL) are required." };
  }

  const sdk = getAuthSdkForSession(session);
  let name = session.auid;
  try {
    const info = await resolveUserDisplayInfo(sdk, session.auid);
    name = info.username || session.auid;
  } catch (error) {
    console.error("Failed to resolve user display info for SAML name:", error);
  }

  try {
    await upsertSamlConfig(session.auid, {
      name,
      entityId,
      acsUrl,
      sloUrl: sloUrl || undefined,
    });

    revalidatePath("/account");
    revalidatePath("/developer/saml");
    return { success: "SAML configuration saved successfully." };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Unable to save SAML configuration.",
    };
  }
}

export async function deleteSamlConfigAction() {
  const session = await requireDeveloperSession();

  try {
    await deleteSamlConfig(session.auid);
    revalidatePath("/account");
    revalidatePath("/developer/saml");
  } catch (error) {
    console.error("Failed to delete SAML configuration:", error);
  }

  redirect("/account?section=developer");
}
