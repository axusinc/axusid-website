import { normalizeScopes, validateScopes } from "@/lib/oauth/constants";
import { InvalidPermissionScopeError, isOidcScope, partitionScopes, validatePermissionScopeCombination } from "@/lib/oauth/scopes";

export type ScopeMode = "required" | "optional" | "conditional";
export type RequestedScope = { scope: string; mode: ScopeMode };
export type AvailableScope = RequestedScope & { available: boolean };
export type ScopeRequest = { scope?: string; optional_scope?: string; conditional_scope?: string };

/** Extra lists must not inherit the default openid scope from normalizeScopes. */
export function parseRequestedScopes(query: ScopeRequest, systemContext: string): RequestedScope[] {
  const result: RequestedScope[] = [];
  const seen = new Set<string>();
  for (const [mode, value] of [
    ["required", query.scope],
    ["optional", query.optional_scope],
    ["conditional", query.conditional_scope],
  ] as const) {
    const scopes = mode === "required" ? normalizeScopes(value) : value?.trim() ? normalizeScopes(value) : [];
    let validated: string[];
    try { validated = validateScopes(scopes); }
    catch (error) { throw new InvalidPermissionScopeError(error instanceof Error ? error.message : "Invalid permission scopes"); }
    for (const scope of validated) {
      if (seen.has(scope)) throw new InvalidPermissionScopeError(`Scope appears in more than one permission mode: ${scope}`);
      if (mode === "conditional" && isOidcScope(scope)) {
        throw new InvalidPermissionScopeError("conditional_scope only supports AXUS permission scopes");
      }
      seen.add(scope);
      result.push({ scope, mode });
    }
  }
  validatePermissionScopeCombination(partitionScopes(result.map(({ scope }) => scope)).axusPermissions, systemContext);
  return result;
}

export class MissingRequiredPermissionsError extends Error {
  constructor(public readonly scopes: string[]) {
    super(`Your account does not have the required permissions: ${scopes.join(", ")}`);
    this.name = "MissingRequiredPermissionsError";
  }
}

/** Only optional choices come from the browser; mandatory/conditional scopes are decided here. */
export function selectGrantedScopes(request: AvailableScope[], selectedOptional: string[]): string[] {
  const optional = new Set(request.filter(({ mode }) => mode === "optional").map(({ scope }) => scope));
  if (selectedOptional.some((scope) => !optional.has(scope))) {
    throw new InvalidPermissionScopeError("An unrequested optional permission was selected");
  }
  const missing = request.filter(({ mode, available }) => mode === "required" && !available).map(({ scope }) => scope);
  if (missing.length) throw new MissingRequiredPermissionsError(missing);
  const selected = new Set(selectedOptional);
  return request.filter(({ scope, mode, available }) => available && (mode !== "optional" || selected.has(scope))).map(({ scope }) => scope);
}
