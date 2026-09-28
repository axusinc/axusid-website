import "server-only";
import { isAuid, normalizePermissionContext } from "@/lib/permission-context";

/** Match the engine's AXUS_ID_CONTEXT. Production engine context is 4. */
export function getSystemPermissionContext(): string {
  const context = process.env.AXUS_SYSTEM_CONTEXT_AUID ?? "4";
  if (!isAuid(context)) throw new Error("AXUS_SYSTEM_CONTEXT_AUID must be an AUID");
  return normalizePermissionContext(context, context);
}
