"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { focusRing } from "@/lib/design";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, "type" | "trailing"> & {
  /** Controlled visibility, for forms that share one toggle across several fields. */
  visible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
};

export function PasswordInput({ visible, onVisibleChange, ...props }: PasswordInputProps) {
  const [internalVisible, setInternalVisible] = useState(false);
  const isVisible = visible ?? internalVisible;
  const toggle = () => {
    const nextVisible = !isVisible;
    setInternalVisible(nextVisible);
    onVisibleChange?.(nextVisible);
  };

  return (
    <Input
      {...props}
      type={isVisible ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={toggle}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-black/[0.05] hover:text-neutral-800",
            focusRing,
          )}
          aria-label={isVisible ? "Hide password" : "Show password"}
          aria-pressed={isVisible}
        >
          {isVisible ? <EyeOff aria-hidden className="h-4 w-4" /> : <Eye aria-hidden className="h-4 w-4" />}
        </button>
      }
    />
  );
}
