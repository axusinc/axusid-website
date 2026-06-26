"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getAuthSdkForSession } from "@/lib/auth-graphql";
import { formatGraphqlError } from "@/lib/graphql-errors";
import { SESSION_COOKIE, getSession, type IdPSession } from "@/lib/session";

export type VariationActionState = {
  error?: string;
  success?: string;
};

async function getActionSession(): Promise<IdPSession | null> {
  const cookieStore = await cookies();
  return getSession(cookieStore.get(SESSION_COOKIE)?.value);
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

export async function updateVariationAction(
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

  const firstName = optionalString(formData.get("firstName"));
  const lastName = optionalString(formData.get("lastName"));
  const status = optionalString(formData.get("status"));
  const description = optionalString(formData.get("description"));

  try {
    const sdk = getAuthSdkForSession(session);
    await Promise.all([
      sdk.ChangeVariationFirstName({
        auid: session.auid,
        variationId,
        firstName,
      }),
      sdk.ChangeVariationLastName({
        auid: session.auid,
        variationId,
        lastName,
      }),
      sdk.ChangeVariationStatus({
        auid: session.auid,
        variationId,
        status,
      }),
      sdk.ChangeVariationDescription({
        auid: session.auid,
        variationId,
        description,
      }),
    ]);
    revalidatePath("/account");
    return { success: "Variation updated." };
  } catch (error) {
    return {
      error: formatGraphqlError(
        error,
        "account",
        "Unable to update variation. Try again.",
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
