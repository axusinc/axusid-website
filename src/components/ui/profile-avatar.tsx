"use client";

import { useState } from "react";
import { Avatar, avatarSizes, type AvatarSize } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type ProfileAvatarProps = {
  imageUrl?: string | null;
  alt: string;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  username?: string | null;
  /** Stable identifier used to pick the fallback color. Falls back to the username. */
  seed?: string | null;
  size?: AvatarSize;
  className?: string;
};

export function ProfileAvatar({
  imageUrl,
  alt,
  firstName,
  lastName,
  displayName,
  username,
  seed,
  size = "md",
  className,
}: ProfileAvatarProps) {
  const [imgError, setImgError] = useState(false);

  if (imageUrl && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={alt}
        onError={() => setImgError(true)}
        className={cn(
          "shrink-0 rounded-full object-cover ring-1 ring-black/[0.06]",
          avatarSizes[size],
          className,
        )}
      />
    );
  }

  return (
    <Avatar
      firstName={firstName}
      lastName={lastName}
      displayName={displayName}
      username={username}
      seed={seed}
      size={size}
      className={className}
    />
  );
}
