"use server";

import { revalidatePath } from "next/cache";
import { getAuthSdkForSession } from "@/lib/auth-graphql";
import { formatGraphqlError } from "@/lib/graphql-errors";
import { getValidSession } from "@/lib/session-access";
import type { IdPSession } from "@/lib/session";
import {
  buildSimpleNameElements,
  parseNameElementsJson,
} from "@/lib/profile-name";

export type VariationActionState = {
  error?: string;
  success?: string;
};

async function getActionSession(): Promise<IdPSession | null> {
  return getValidSession();
}

function optionalString(value: FormDataEntryValue | null): string | undefined {
  const trimmed = String(value ?? "").trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function createVariationAction(
  _prevState: VariationActionState,
  formData: FormData,
): Promise<VariationActionState> {
  const session = await getActionSession();
  if (!session) {
    return { error: "Your session has expired. Sign in again." };
  }

  try {
    const sdk = getAuthSdkForSession(session);
    const firstName = optionalString(formData.get("firstName"));
    const lastName = optionalString(formData.get("lastName"));
    const status = optionalString(formData.get("status"));
    const result = await sdk.CreateVariation({
      auid: session.auid,
      description: optionalString(formData.get("description")),
    });
    const variationId = result.createVariation.id;

    if (firstName || lastName) {
      await sdk.ChangeName({
        auid: session.auid,
        variationId,
        elements: buildSimpleNameElements(firstName, lastName),
      });
    }
    if (status) {
      await sdk.ChangeStatus({
        auid: session.auid,
        variationId,
        text: status,
      });
    }
    revalidatePath("/account");
    return { success: "Variation created." };
  } catch (error) {
    return {
      error: formatGraphqlError(
        error,
        "account",
        "Unable to create variation. Try again.",
      ),
    };
  }
}

type ProfileField = "status" | "description" | "name";

const fieldSuccessMessages: Record<ProfileField, string> = {
  name: "Name updated.",
  status: "Status updated.",
  description: "Bio updated.",
};

export async function updateVariationFieldAction(
  _prevState: VariationActionState,
  formData: FormData,
): Promise<VariationActionState> {
  const session = await getActionSession();
  if (!session) {
    return { error: "Your session has expired. Sign in again." };
  }

  const variationId = String(formData.get("variationId") ?? "").trim();
  if (!variationId) {
    return { error: "Profile is required." };
  }

  const field = String(formData.get("field") ?? "").trim() as ProfileField;
  if (!field || !(field in fieldSuccessMessages)) {
    return { error: "Unknown field." };
  }

  try {
    const sdk = getAuthSdkForSession(session);
    const auid = session.auid;

    if (field === "name") {
      let elements;
      try {
        elements = parseNameElementsJson(formData.get("nameElements"));
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : "Name details are invalid.",
        };
      }

      await sdk.ChangeName({
        auid,
        variationId,
        elements,
      });
    } else if (field === "status") {
      await sdk.ChangeStatus({
        auid,
        variationId,
        text: optionalString(formData.get("status")),
      });
    } else if (field === "description") {
      await sdk.ChangeDescription({
        auid,
        variationId,
        text: optionalString(formData.get("description")),
      });
    }

    revalidatePath("/account");
    return { success: fieldSuccessMessages[field] };
  } catch (error) {
    return {
      error: formatGraphqlError(
        error,
        "account",
        "Unable to update profile. Try again.",
      ),
    };
  }
}

export async function changeUsernameAction(
  _prevState: VariationActionState,
  formData: FormData,
): Promise<VariationActionState> {
  const session = await getActionSession();
  if (!session) {
    return { error: "Your session has expired. Sign in again." };
  }

  const oldUsername = String(formData.get("oldUsername") ?? "").trim();
  const newUsername = String(formData.get("newUsername") ?? "").trim();

  if (!oldUsername) {
    return { error: "Current username is required." };
  }

  if (!newUsername) {
    return { error: "New username is required." };
  }

  if (oldUsername === newUsername) {
    return { error: "New username must be different from the current one." };
  }

  try {
    const sdk = getAuthSdkForSession(session);
    await sdk.ChangeUsername({
      auid: session.auid,
      oldUsername,
      newUsername,
    });
    revalidatePath("/account");
    return { success: "Username updated." };
  } catch (error) {
    return {
      error: formatGraphqlError(
        error,
        "account",
        "Unable to change username. Try again.",
      ),
    };
  }
}

export async function setDefaultVariationAction(
  _prevState: VariationActionState,
  formData: FormData,
): Promise<VariationActionState> {
  const session = await getActionSession();
  if (!session) {
    return { error: "Your session has expired. Sign in again." };
  }

  const variationId = String(formData.get("variationId") ?? "").trim();
  if (!variationId) {
    return { error: "Variation is required." };
  }

  const currentDefaultId = String(formData.get("currentDefaultId") ?? "").trim();
  if (currentDefaultId === variationId) {
    return { success: "This variation is already the default." };
  }

  try {
    const sdk = getAuthSdkForSession(session);
    await sdk.SetDefaultVariation({
      auid: session.auid,
      variationId,
    });
    revalidatePath("/account");
    return { success: "Default variation updated." };
  } catch (error) {
    return {
      error: formatGraphqlError(
        error,
        "account",
        "Unable to set default variation. Try again.",
      ),
    };
  }
}
