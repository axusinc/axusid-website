"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireDeveloperSession } from "@/lib/oauth/developer";
import { upsertSamlConfig, deleteSamlConfig } from "@/lib/saml/saml-store";

export type SamlActionState = {
  error?: string;
  success?: string;
};

export async function saveSamlConfigAction(
  _prevState: SamlActionState,
  formData: FormData,
): Promise<SamlActionState> {
  const session = await requireDeveloperSession();
  const name = String(formData.get("name") ?? "").trim();
  const entityId = String(formData.get("entityId") ?? "").trim();
  const acsUrl = String(formData.get("acsUrl") ?? "").trim();
  const sloUrl = String(formData.get("sloUrl") ?? "").trim();

  if (!name || !entityId || !acsUrl) {
    return { error: "All fields (App Name, Entity ID, ACS URL) are required." };
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
