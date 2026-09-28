/** Context is part of permission identity, including for UI and cache keys. */
export function permissionIdentity(key: string, context: string | null | undefined): string {
  return JSON.stringify([context ?? null, key]);
}

export function normalizePermissionContext(context: string | null | undefined, systemContext: string): string {
  return (context ?? systemContext).split(",").map((part) => BigInt(part).toString()).join(",");
}

export function isAuid(value: string): boolean {
  return /^[0-9]+(?:,[0-9]+)*$/.test(value);
}

/** Bindings stay strings: LONG values must never pass through a JS number. */
export function bindPermission(template: string, bindings: Record<string, string>): string | null {
  let complete = true;
  const key = template.replace(/\{([^{}]+)\}/g, (_, name: string) => {
    const value = bindings[name];
    if (!value || value.includes(".")) complete = false;
    return value ?? "";
  });
  return complete ? key : null;
}
