"use client";

import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { UsernameAvatar } from "@/components/username-avatar";
import type { AvatarSize } from "@/components/ui/avatar";
import type { PermissionContext } from "@/lib/permission-types";

export function AccountAvatar({
  account,
  size = "sm",
  className,
  shape = "rounded",
}: {
  account: PermissionContext;
  size?: AvatarSize;
  className?: string;
  shape?: "circle" | "rounded";
}) {
  if (account.avatarUrl) {
    return (
      <ProfileAvatar
        imageUrl={account.avatarUrl}
        username={account.username}
        displayName={account.label}
        alt=""
        seed={account.id}
        size={size}
        className={className}
        shape={shape}
      />
    );
  }
  if (account.username) {
    return (
      <UsernameAvatar
        username={account.username}
        displayName={account.label}
        size={size}
        className={className}
        shape={shape}
      />
    );
  }
  return (
    <ProfileAvatar
      alt=""
      seed={account.id}
      displayName={account.label}
      size={size}
      className={className}
      shape={shape}
    />
  );
}
