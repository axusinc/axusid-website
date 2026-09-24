"use client";

import Link from "next/link";
import { useState, useRef, useEffect, useTransition, useOptimistic } from "react";
import { createPortal } from "react-dom";
import { logoutAction, logoutAllAction, switchAccountAction } from "@/app/actions/auth";
import { ChevronDown, LogOut, UserPlus } from "lucide-react";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { Button } from "@/components/ui/button";
import { IdentityLabel } from "@/components/ui/identity-label";
import { Spinner } from "@/components/ui/spinner";
import { eyebrow, focusRing, popoverSurface } from "@/lib/design";
import { cn } from "@/lib/utils";
import type { AccountItemInfo } from "@/lib/user-profile";

type UserAccountSwitcherProps = {
  accounts: AccountItemInfo[];
  currentAuid: string;
  direction?: "up" | "down";
  align?: "left" | "right";
};

export function UserAccountSwitcher({
  accounts,
  currentAuid,
  direction = "down",
  align = "right",
}: UserAccountSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    bottom: number;
    left: number;
    right: number;
  } | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [optimisticAuid, setOptimisticAuid] = useOptimistic(
    currentAuid,
    (_state, newAuid: string) => newAuid,
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
      });
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    updateCoords();
    window.addEventListener("resize", updateCoords);
    window.addEventListener("scroll", updateCoords, true);

    return () => {
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords, true);
    };
  }, [isOpen]);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const activeAccount = accounts.find((acc) => acc.auid === optimisticAuid) || accounts[0];

  if (!activeAccount) return null;

  const otherAccounts = accounts.filter((account) => account.auid !== activeAccount.auid);

  const handleSwitchAccount = (targetAuid: string) => {
    if (isPending || targetAuid === optimisticAuid) return;
    setSwitchError(null);
    setIsOpen(false);
    startTransition(async () => {
      setOptimisticAuid(targetAuid);
      const formData = new FormData();
      formData.set("auid", targetAuid);
      try {
        // Updating the session cookie returns the refreshed UI with this action.
        // A router.refresh() here would load the entire dashboard a second time.
        const result = await switchAccountAction(formData);
        if (result.error) setSwitchError(result.error);
      } catch {
        setSwitchError("We couldn’t switch accounts. Try again.");
      }
    });
  };

  const activeUsernameText = activeAccount.username
    ? `@${activeAccount.username}`
    : activeAccount.displayName;

  const toggleOpen = () => {
    if (!isOpen) {
      updateCoords();
    }
    setIsOpen((prev) => !prev);
  };

  const getPopoverStyle = (): React.CSSProperties => {
    if (!coords) return { position: "fixed", opacity: 0, pointerEvents: "none" };

    const style: React.CSSProperties = {
      position: "fixed",
      zIndex: 9999,
    };

    if (direction === "up") {
      style.bottom = `${window.innerHeight - coords.top + 8}px`;
    } else {
      style.top = `${coords.bottom + 8}px`;
    }

    if (align === "left") {
      style.left = `${coords.left}px`;
    } else {
      style.right = `${window.innerWidth - coords.right}px`;
    }

    return style;
  };

  const popoverContent = isOpen && (
    <div
      ref={dropdownRef}
      style={getPopoverStyle()}
      role="dialog"
      aria-label="Accounts"
      className={cn(
        "w-80 max-w-[calc(100vw-24px)] overflow-hidden animate-[fadeIn_0.15s_ease-out]",
        popoverSurface,
        "rounded-2xl",
      )}
    >
      <div className="flex items-center gap-3 border-b border-black/[0.06] p-4">
        <ProfileAvatar
          imageUrl={activeAccount.avatarUrl}
          alt={activeAccount.displayName}
          firstName={activeAccount.firstName}
          lastName={activeAccount.lastName}
          displayName={activeAccount.displayName}
          username={activeAccount.username}
          seed={activeAccount.auid}
        />
        <IdentityLabel
          className="flex-1"
          displayName={activeAccount.displayName}
          username={activeAccount.username}
          firstName={activeAccount.firstName}
          lastName={activeAccount.lastName}
        />
        <form action={logoutAction}>
          <input type="hidden" name="auid" value={activeAccount.auid} />
          <Button type="submit" variant="secondary" size="sm">
            Sign out
          </Button>
        </form>
      </div>

      {otherAccounts.length > 0 ? (
        <div className="border-b border-black/[0.06] p-1.5">
          <p className={cn(eyebrow, "px-2.5 pb-1 pt-2")}>Switch account</p>
          <ul>
            {otherAccounts.map((account) => (
              <li key={account.auid} className="group flex items-center rounded-xl hover:bg-black/[0.04]">
                <button
                  type="button"
                  onClick={() => handleSwitchAccount(account.auid)}
                  className={cn(
                    "flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-left",
                    focusRing,
                  )}
                >
                  <ProfileAvatar
                    size="sm"
                    imageUrl={account.avatarUrl}
                    alt={account.displayName}
                    firstName={account.firstName}
                    lastName={account.lastName}
                    displayName={account.displayName}
                    username={account.username}
                    seed={account.auid}
                  />
                  <IdentityLabel
                    className="flex-1"
                    displayName={account.displayName}
                    username={account.username}
                    firstName={account.firstName}
                    lastName={account.lastName}
                  />
                </button>
                <form action={logoutAction} className="pr-1.5">
                  <input type="hidden" name="auid" value={account.auid} />
                  <button
                    type="submit"
                    title="Sign out of this account"
                    aria-label={`Sign out of ${account.username ? `@${account.username}` : account.displayName}`}
                    className={cn(
                      "flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-neutral-400 opacity-100 transition hover:bg-red-50 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100",
                      focusRing,
                    )}
                  >
                    <LogOut aria-hidden className="h-4 w-4" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="p-1.5">
        <Link
          href="/login?add_account=true"
          className={cn(
            "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-black/[0.04] hover:text-neutral-950",
            focusRing,
          )}
          onClick={() => setIsOpen(false)}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-black/15 text-neutral-500">
            <UserPlus aria-hidden className="h-4 w-4" />
          </span>
          Add another account
        </Link>
        {accounts.length > 1 ? (
          <form action={logoutAllAction}>
            <button
              type="submit"
              className={cn(
                "flex w-full cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-red-50 hover:text-red-700",
                focusRing,
              )}
            >
              <span className="flex h-8 w-8 items-center justify-center">
                <LogOut aria-hidden className="h-4 w-4" />
              </span>
              Sign out of all accounts
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="relative inline-block text-left">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        disabled={isPending}
        aria-busy={isPending}
        className={cn(
          "group inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-black/[0.08] bg-white py-1 pl-1 pr-2.5 text-sm font-medium text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:border-black/15",
          focusRing,
          isOpen && "border-black/15 ring-4 ring-black/[0.06]",
          isPending && "cursor-wait opacity-80",
        )}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`Account menu for ${activeUsernameText}`}
      >
        <ProfileAvatar
          size="sm"
          imageUrl={activeAccount.avatarUrl}
          alt={activeAccount.displayName}
          firstName={activeAccount.firstName}
          lastName={activeAccount.lastName}
          displayName={activeAccount.displayName}
          username={activeAccount.username}
          seed={activeAccount.auid}
        />
        <span className="hidden max-w-[140px] truncate min-[420px]:inline">{activeUsernameText}</span>
        {accounts.length > 1 ? (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-neutral-100 px-1.5 text-[11px] font-semibold text-neutral-600">
            {accounts.length}
          </span>
        ) : null}
        {isPending ? (
          <Spinner className="h-3.5 w-3.5 text-neutral-400" />
        ) : (
          <ChevronDown
            aria-hidden
            className={cn(
              "h-3.5 w-3.5 text-neutral-400 transition-transform duration-200",
              isOpen && "rotate-180 text-neutral-900",
              direction === "up" && !isOpen && "rotate-180",
            )}
          />
        )}
      </button>

      {switchError ? <p role="alert" className="mt-2 max-w-80 text-sm text-red-600">{switchError}</p> : null}

      {mounted && popoverContent ? createPortal(popoverContent, document.body) : null}
    </div>
  );
}
