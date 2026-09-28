"use server";

import { z } from "zod";
import { getAuthSdkForSession } from "@/lib/auth-graphql";
import { getValidSession } from "@/lib/session-access";
import { permissionErrorMessage } from "@/lib/graphql-errors";
import { parseDeclarationJson } from "@/lib/permission-declaration-input";
import type { DeclarationSummaryFragment } from "@/graphql/sdk";

type DeclarationRequest = { kind: "list" } | { kind: "publish"; json: string } | { kind: "invalidate"; declarationId: string };
type DeclarationResult = { declarations?: DeclarationSummaryFragment[]; published?: DeclarationSummaryFragment; invalidated?: boolean; error?: string };
const requestSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("list") }),
  z.object({ kind: z.literal("publish"), json: z.string().min(1).max(65536) }),
  z.object({ kind: z.literal("invalidate"), declarationId: z.uuid() }),
]);

export async function declarationAction(input: DeclarationRequest): Promise<DeclarationResult> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return { error: "Check the declaration input and try again." };
  const session = await getValidSession();
  if (!session) return { error: "Your session has ended. Sign in again." };
  const sdk = getAuthSdkForSession(session);
  const args = parsed.data;
  try {
    if (args.kind === "publish") {
      const result = parseDeclarationJson(args.json);
      if (result.error) return { error: result.error };
      const { publishPermissionDeclaration } = await sdk.PublishPermissionDeclaration({ ownerAuid: session.auid, declaration: result.declaration! });
      return { published: publishPermissionDeclaration };
    }
    const { permissionDeclarations } = await sdk.PermissionDeclarations({ contextAuid: session.auid });
    if (args.kind === "list") return { declarations: permissionDeclarations };
    if (!permissionDeclarations.some((declaration) => declaration.id === args.declarationId)) return { error: "This declaration does not belong to your app. Refresh the list." };
    const { notifyValidationChanged } = await sdk.NotifyValidationChanged({ declarationId: args.declarationId });
    return notifyValidationChanged ? { invalidated: true } : { error: "Couldn’t clear cached validation. Please try again." };
  } catch (error) { return { error: permissionErrorMessage(error) }; }
}
