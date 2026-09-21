export type UserPermission = {
  key: string;
  label: string;
  scope: string;
  description: string;
  available: boolean | null;
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
  | { kind: "share"; username: string; permission: string }
  | { kind: "revoke"; grantId: string };

export type PermissionResult = {
  error?: string;
  permissions?: UserPermission[];
  shareOptions?: UserPermission[];
  shared?: SharedPermission[];
  sharedGrant?: SharedPermission;
  alreadyShared?: boolean;
  revoked?: boolean;
};
