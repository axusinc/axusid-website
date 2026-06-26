"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  validateRedirectUris,
  validateSupportedScopes,
  type OAuthClient,
} from "@/lib/oauth/constants";
import {
  createClient,
  deleteClient,
  getClientForOwner,
  updateClient,
} from "@/lib/oauth/client-store";
import { requireDeveloperSession } from "@/lib/oauth/developer";

export type DeveloperActionState = {
  error?: string;
  success?: string;
  clientId?: string;
};

function parseScopes(raw: FormData): string[] {
  const scopes = raw
    .getAll("allowedScopes")
    .map((value) => String(value))
    .filter(Boolean);

  if (scopes.length === 0) {
    throw new Error("Select at least one scope.");
  }

  return validateSupportedScopes(scopes);
}

function parseRedirectUris(raw: FormData): string[] {
  const value = String(raw.get("redirectUris") ?? "");
  return validateRedirectUris(value.split("\n"));
}

export async function createClientAction(
  _prevState: DeveloperActionState,
  formData: FormData,
): Promise<DeveloperActionState> {
  const session = await requireDeveloperSession();
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return { error: "App name is required." };
  }

  let client: OAuthClient;
  try {
    const redirectUris = parseRedirectUris(formData);
    const allowedScopes = parseScopes(formData);
    client = await createClient({
      name,
      redirectUris,
      allowedScopes,
      ownerAuid: session.auid,
    });

    revalidatePath("/developer/oauth/clients");
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Unable to create client.",
    };
  }

  redirect(`/developer/oauth/clients/${client.clientId}?created=1`);
}

export async function updateClientAction(
  _prevState: DeveloperActionState,
  formData: FormData,
): Promise<DeveloperActionState> {
  const session = await requireDeveloperSession();
  const clientId = String(formData.get("clientId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();

  if (!clientId || !name) {
    return { error: "Client ID and app name are required." };
  }

  try {
    const redirectUris = parseRedirectUris(formData);
    const allowedScopes = parseScopes(formData);
    const client = await updateClient(clientId, session.auid, {
      name,
      redirectUris,
      allowedScopes,
    });

    if (!client) {
      return { error: "Client not found." };
    }

    revalidatePath("/developer/oauth/clients");
    revalidatePath(`/developer/oauth/clients/${clientId}`);
    return { success: "Client updated." };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Unable to update client.",
    };
  }
}

export async function deleteClientAction(formData: FormData) {
  const session = await requireDeveloperSession();
  const clientId = String(formData.get("clientId") ?? "").trim();

  if (!clientId) {
    redirect("/developer/oauth/clients");
  }

  const existing = await getClientForOwner(clientId, session.auid);
  if (!existing) {
    redirect("/developer/oauth/clients");
  }

  await deleteClient(clientId, session.auid);
  revalidatePath("/developer/oauth/clients");
  redirect("/developer/oauth/clients");
}
