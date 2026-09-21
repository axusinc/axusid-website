// Known permission names from the engine's UserPermissions. Labels never expose internal IDs.
const labels: Record<string, { label: string; description: string }> = {
  "variation.write": { label: "Edit profile", description: "Change the name, description and status on this account’s profiles." },
  "username.write": { label: "Manage usernames", description: "Add, change or remove usernames for this account." },
  "grants.read": { label: "View permissions", description: "See permissions received and shared by this account." },
  "grants.delegate": { label: "Share permissions", description: "Delegate permissions on this account’s behalf and remove its delegations." },
  "password.change": { label: "Change password", description: "Change the password used to sign in to this account." },
  "token.issue": { label: "Create sign-in tokens", description: "Issue tokens to access this account." },
  "mfa.write": { label: "Manage two-step verification", description: "Change two-step verification settings for this account." },
  "parents.write": { label: "Manage parent accounts", description: "Change this account’s parent relationships." },
  "parents.agree": { label: "Approve parent relationships", description: "Approve requests to link parent accounts." },
  "ratelimit.drain": { label: "Use request allowance", description: "Use this account’s request allowance." },
  create: { label: "Create nested accounts", description: "Create accounts under this account." },
  "*": { label: "Manage account", description: "All permissions for this account, including changing settings and sharing access." },
};

export function permissionPresentation(key: string) {
  if (key === "*" || key === "identity.*") {
    return { label: "All permissions", description: "All access covered by this permission.", target: "*" };
  }
  const parts = key.split(".");
  const target = parts[0] === "identity" ? parts[1] : undefined;
  const resource = target ? parts.slice(2).join(".") : key;
  const known = target ? labels[resource] : undefined;
  if (known) return { ...known, target };
  const words = resource.split(".").filter((part) => /^[a-zA-Z_]+$/.test(part)).map((part) => part.replace(/_/g, " "));
  const text = words.join(" ");
  return {
    label: text ? text.charAt(0).toUpperCase() + text.slice(1) : "Additional account access",
    description: "Additional access assigned to your account.",
    target,
  };
}

export function specificPermissionChoices(auid: string, assigned: string[]): string[] {
  const targets = new Set([auid]);
  for (const key of assigned) {
    const target = permissionPresentation(key).target;
    if (target && target !== "*") targets.add(target);
  }
  return [...new Set([
    ...assigned.filter((key) => !key.includes("*")),
    ...[...targets].flatMap((target) => ["variation.write", "username.write", "grants.read", "grants.delegate"]
      .map((suffix) => `identity.${target}.${suffix}`)),
  ])];
}
