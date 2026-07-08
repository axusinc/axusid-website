"use server";

import { revalidatePath } from "next/cache";
import { getAuthSdkForSession } from "@/lib/auth-graphql";
import { formatGraphqlError } from "@/lib/graphql-errors";
import { getValidSession } from "@/lib/session-access";
import type { IdPSession } from "@/lib/session";

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
    await sdk.CreateVariation({
      auid: session.auid,
      firstName: optionalString(formData.get("firstName")),
      lastName: optionalString(formData.get("lastName")),
      status: optionalString(formData.get("status")),
      description: optionalString(formData.get("description")),
    });
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

type ProfileField = "firstName" | "lastName" | "status" | "description" | "name";

const fieldSuccessMessages: Record<ProfileField, string> = {
  firstName: "First name updated.",
  lastName: "Last name updated.",
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
      await Promise.all([
        sdk.ChangeVariationFirstName({
          auid,
          variationId,
          firstName: optionalString(formData.get("firstName")),
        }),
        sdk.ChangeVariationLastName({
          auid,
          variationId,
          lastName: optionalString(formData.get("lastName")),
        }),
      ]);
    } else if (field === "firstName") {
      await sdk.ChangeVariationFirstName({
        auid,
        variationId,
        firstName: optionalString(formData.get("firstName")),
      });
    } else if (field === "lastName") {
      await sdk.ChangeVariationLastName({
        auid,
        variationId,
        lastName: optionalString(formData.get("lastName")),
      });
    } else if (field === "status") {
      await sdk.ChangeVariationStatus({
        auid,
        variationId,
        status: optionalString(formData.get("status")),
      });
    } else if (field === "description") {
      await sdk.ChangeVariationDescription({
        auid,
        variationId,
        description: optionalString(formData.get("description")),
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
