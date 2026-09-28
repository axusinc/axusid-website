import type { DeclarationSummaryFragment, ParameterOptionsFragment, DescribePermissionQuery } from "@/graphql/sdk";

export type PermissionContext = { id: string; label: string; username: string | null; avatarUrl: string | null };
export type PickerDeclaration = DeclarationSummaryFragment & { group: string; params: ParameterOptionsFragment[] };
export type UserPermission = {
  key: string;
  context: string;
  label: string;
  scope: string;
  description: string;
  available: boolean | null;
  icon?: string | null;
  params?: DescribePermissionQuery["describePermission"]["params"];
  receivedFrom?: {
    id: string;
    username: string | null;
  } | null;
};

export type SharedPermission = {
  id: string;
  recipientId: string;
  username: string | null;
  permission: UserPermission;
  state: "shared" | "paused" | "pending" | "restricted" | "unverified";
};

export type PermissionRequest =
  | { kind: "list" }
  | { kind: "share"; username: string; permission: string; permissionContext?: string | null }
  | { kind: "catalog"; permissionContext: string }
  | { kind: "resolve-context"; username: string }
  | { kind: "resolve-account"; accountId: string }
  | { kind: "preview"; permission: string; permissionContext: string }
  | { kind: "search"; permissionContext: string; declarationId: string; param: string; query: string }
  | { kind: "search-accounts"; permissionContext: string; declarationId: string; param: string; query: string }
  | { kind: "revoke"; grantId: string };

export type PermissionResult = {
  error?: string;
  recoveryRequired?: boolean;
  contexts?: PermissionContext[];
  systemContext?: string;
  accountAuid?: string;
  context?: PermissionContext;
  declarations?: PickerDeclaration[];
  preview?: UserPermission;
  options?: ParameterOptionsFragment;
  accountSuggestions?: PermissionContext[];
  permissions?: UserPermission[];
  shareOptions?: UserPermission[];
  shared?: SharedPermission[];
  sharedGrant?: SharedPermission;
  alreadyShared?: boolean;
  revoked?: boolean;
};
