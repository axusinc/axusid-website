"use client";

import { useEffect, useState } from "react";
import { avatarUrlForUsernameAction } from "@/app/actions/auth";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import type { AvatarSize } from "@/components/ui/avatar";

type UsernameAvatarProps = {
  username?: string | null;
  size?: AvatarSize;
  className?: string;
  shape?: "circle" | "rounded";
};

/**
 * Profile photo for any username, resolved on demand. Starts with (and falls
 * back to) initials, so rows for other users never block on the lookup.
 */
export function UsernameAvatar({ username, size = "sm", className, shape }: UsernameAvatarProps) {
  const normalized = (username ?? "").trim().replace(/^@/, "");
  const [resolved, setResolved] = useState<{ username: string; url: string | null } | null>(null);

  useEffect(() => {
    if (!normalized) return;
    let active = true;
    avatarUrlForUsernameAction(normalized)
      .then((result) => {
        if (active) setResolved({ username: normalized, url: result.url });
      })
      .catch(() => {
        if (active) setResolved({ username: normalized, url: null });
      });
    return () => {
      active = false;
    };
  }, [normalized]);

  const imageUrl = resolved?.username === normalized ? resolved.url : null;

  return (
    <ProfileAvatar
      imageUrl={imageUrl}
      alt={normalized ? `@${normalized}` : "Account photo"}
      username={normalized || undefined}
      seed={normalized || undefined}
      size={size}
      className={className}
      shape={shape}
    />
  );
}
