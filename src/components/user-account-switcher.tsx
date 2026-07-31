"use client";

import Link from "next/link";
import { useState, useRef, useEffect, useTransition, useOptimistic } from "react";
import { useRouter } from "next/navigation";
import { logoutAction, logoutAllAction, switchAccountAction } from "@/app/actions/auth";
import { Avatar } from "@/app/account/dashboard-ui";
import { popoverSurface, roundedRect } from "@/lib/design";
import { cn } from "@/lib/utils";
import type { AccountItemInfo } from "@/lib/user-profile";

type UserAccountSwitcherProps = {
  accounts: AccountItemInfo[];
  currentAuid: string;
};

export function UserAccountSwitcher({ accounts, currentAuid }: UserAccountSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [optimisticAuid, setOptimisticAuid] = useOptimistic(
    currentAuid,
    (_state, newAuid: string) => newAuid,
  );

  const activeAccount = accounts.find((acc) => acc.auid === optimisticAuid) || accounts[0];

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  if (!activeAccount) return null;

  const handleSwitchAccount = (targetAuid: string) => {
    if (targetAuid === optimisticAuid) return;
    setIsOpen(false);
    startTransition(async () => {
      setOptimisticAuid(targetAuid);
      const formData = new FormData();
      formData.set("auid", targetAuid);
      await switchAccountAction(formData);
      router.refresh();
    });
  };

  const activeUsernameText = activeAccount.username
    ? `@${activeAccount.username}`
    : activeAccount.displayName;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "group relative inline-flex items-center gap-2 border border-black/10 bg-white/80 px-3 py-1.5 text-xs font-medium text-neutral-900 transition-all hover:bg-white hover:border-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/15 shadow-2xs cursor-pointer",
          roundedRect,
          isOpen && "ring-2 ring-black/15 bg-white border-black/20 shadow-xs",
          isPending && "opacity-80 cursor-wait",
        )}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Switch account"
      >
        <div className="relative flex items-center shrink-0">
          <Avatar
            firstName={activeAccount.firstName}
            lastName={activeAccount.lastName}
            username={activeAccount.username}
            size="sm"
            className="h-6 w-6 ring-0 text-[10px]"
          />
          {accounts.length > 1 && (
            <span className="ml-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-neutral-900 text-[10px] font-semibold text-white leading-none">
              {accounts.length}
            </span>
          )}
        </div>
        <span className="text-xs font-semibold text-neutral-900 truncate max-w-[120px]">
          {activeUsernameText}
        </span>
        {isPending ? (
          <svg className="h-3.5 w-3.5 text-neutral-400 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={cn(
              "h-3.5 w-3.5 text-neutral-400 transition-transform duration-200",
              isOpen && "rotate-180 text-black",
            )}
          >
            <path
              fillRule="evenodd"
              d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>

      {/* Account Selector Dropdown Popover */}
      {isOpen && (
        <div
          className={cn(
            "absolute right-0 z-50 mt-2 w-72 sm:w-80 origin-top-right p-3 animate-[fadeIn_0.15s_ease-out]",
            popoverSurface,
            roundedRect,
          )}
        >
          <div className="px-2 pt-0.5 pb-2 flex items-center justify-between border-b border-black/5 mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              Signed-in Accounts
            </p>
            <span className="text-[10px] font-semibold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
              {accounts.length}
            </span>
          </div>

          {/* Account List */}
          <div className="space-y-1.5">
            {accounts.map((account) => {
              const isActive = account.auid === activeAccount.auid;
              const usernameDisplay = account.username ? `@${account.username}` : null;

              return (
                <div
                  key={account.auid}
                  className={cn(
                    "group flex items-center justify-between p-2.5 transition-all border",
                    roundedRect,
                    isActive
                      ? "border-black/15 bg-neutral-100/90 shadow-2xs"
                      : "border-black/5 bg-white/50 hover:bg-neutral-50 hover:border-black/10",
                  )}
                >
                  {isActive ? (
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <Avatar
                        firstName={account.firstName}
                        lastName={account.lastName}
                        username={account.username}
                        size="sm"
                        className="h-8 w-8 text-xs font-bold shrink-0 ring-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold text-black truncate">
                            {account.displayName}
                          </p>
                          <span className="shrink-0 text-[10px] font-semibold text-neutral-600 bg-black/[0.06] px-2 py-0.5 rounded-md">
                            Active
                          </span>
                        </div>
                        {usernameDisplay && (
                          <p className="text-[11px] text-neutral-500 truncate">
                            {usernameDisplay}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSwitchAccount(account.auid)}
                      className="flex min-w-0 flex-1 items-center gap-2.5 text-left focus:outline-none cursor-pointer"
                    >
                      <Avatar
                        firstName={account.firstName}
                        lastName={account.lastName}
                        username={account.username}
                        size="sm"
                        className="h-8 w-8 text-xs font-semibold shrink-0 ring-0 opacity-90 group-hover:opacity-100"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-neutral-800 group-hover:text-black truncate">
                          {account.displayName}
                        </p>
                        {usernameDisplay && (
                          <p className="text-[11px] text-neutral-500 truncate">
                            {usernameDisplay}
                          </p>
                        )}
                      </div>
                    </button>
                  )}

                  {/* Individual Account Sign Out */}
                  <form action={logoutAction} className="ml-1.5 shrink-0">
                    <input type="hidden" name="auid" value={account.auid} />
                    <button
                      type="submit"
                      title="Sign out of this account"
                      className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors rounded-lg cursor-pointer"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    </button>
                  </form>
                </div>
              );
            })}
          </div>

          {/* Action Options */}
          <div className="mt-2.5 pt-2 border-t border-black/5 space-y-1.5">
            <Link
              href="/login?add_account=true"
              className={cn(
                "flex w-full items-center gap-2.5 px-3 py-2 border border-dashed border-black/15 bg-neutral-50/60 hover:bg-neutral-100/90 text-neutral-700 hover:text-black text-xs font-medium transition-all cursor-pointer",
                roundedRect,
              )}
              onClick={() => setIsOpen(false)}
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-black/5 text-neutral-700">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span>Add another account</span>
            </Link>

            <form action={logoutAllAction}>
              <button
                type="submit"
                className={cn(
                  "flex w-full items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50/80 transition-colors cursor-pointer",
                  roundedRect,
                )}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign out of all accounts
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
