"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { logoutAction, logoutAllAction, switchAccountAction } from "@/app/actions/auth";
import { Avatar } from "@/app/account/dashboard-ui";
import { cardSurface, roundedRect } from "@/lib/design";
import { cn } from "@/lib/utils";
import type { AccountItemInfo } from "@/lib/user-profile";

type UserAccountSwitcherProps = {
  accounts: AccountItemInfo[];
  currentAuid: string;
};

export function UserAccountSwitcher({ accounts, currentAuid }: UserAccountSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeAccount = accounts.find((acc) => acc.auid === currentAuid) || accounts[0];

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

  const activeUsernameText = activeAccount.username
    ? `@${activeAccount.username}`
    : activeAccount.displayName;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "group relative inline-flex items-center gap-2 border border-black/10 bg-white/70 px-2.5 py-1.5 text-xs font-medium text-neutral-800 transition-all hover:bg-white hover:border-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 shadow-2xs",
          roundedRect,
          isOpen && "ring-2 ring-black/20 bg-white border-black/20 shadow-xs",
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
            className="h-5 w-5 ring-0 text-[10px]"
          />
          {accounts.length > 1 && (
            <span className="ml-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-black text-[9px] font-bold text-white leading-none">
              {accounts.length}
            </span>
          )}
        </div>
        <span className="text-xs font-medium text-black">
          {activeUsernameText}
        </span>
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
      </button>

      {/* Account Selector Dropdown Popover */}
      {isOpen && (
        <div
          className={cn(
            "absolute right-0 z-50 mt-1.5 w-64 sm:w-72 origin-top-right p-2.5 shadow-xl animate-[fadeIn_0.15s_ease-out]",
            cardSurface,
            roundedRect,
          )}
        >
          <div className="px-2 pt-0.5 pb-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              Signed-in Accounts ({accounts.length})
            </p>
          </div>

          {/* Uniform List of Accounts */}
          <div className="space-y-1">
            {accounts.map((account) => {
              const isActive = account.auid === activeAccount.auid;
              const usernameDisplay = account.username ? `@${account.username}` : null;

              return (
                <div
                  key={account.auid}
                  className={cn(
                    "group flex items-center justify-between p-2 transition-all border",
                    roundedRect,
                    isActive
                      ? "border-black/15 bg-black/5 shadow-2xs"
                      : "border-transparent hover:bg-black/[0.03] hover:border-black/5",
                  )}
                >
                  {isActive ? (
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <Avatar
                        firstName={account.firstName}
                        lastName={account.lastName}
                        username={account.username}
                        size="sm"
                        className="h-7 w-7 text-xs font-semibold shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold text-black truncate">
                            {account.displayName}
                          </p>
                          <span className="shrink-0 text-[9px] font-medium bg-black text-white px-1.5 py-0.5 rounded-full">
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
                    <form action={switchAccountAction} className="flex min-w-0 flex-1 items-center gap-2.5">
                      <input type="hidden" name="auid" value={account.auid} />
                      <button
                        type="submit"
                        className="flex min-w-0 flex-1 items-center gap-2.5 text-left focus:outline-none"
                      >
                        <Avatar
                          firstName={account.firstName}
                          lastName={account.lastName}
                          username={account.username}
                          size="sm"
                          className="h-7 w-7 text-xs font-semibold shrink-0"
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
                    </form>
                  )}

                  {/* Individual Account Sign Out */}
                  <form action={logoutAction} className="ml-1">
                    <input type="hidden" name="auid" value={account.auid} />
                    <button
                      type="submit"
                      title="Sign out of this account"
                      className="p-1 text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors rounded-md"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    </button>
                  </form>
                </div>
              );
            })}
          </div>

          {/* Action Options */}
          <div className="mt-1.5 space-y-1 border-t border-black/5 pt-1.5">
            <Link
              href="/login?add_account=true"
              className={cn(
                "flex w-full items-center justify-center gap-1.5 border border-black/5 bg-neutral-50/80 px-2.5 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-black",
                roundedRect,
              )}
              onClick={() => setIsOpen(false)}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add another account
            </Link>

            <form action={logoutAllAction}>
              <button
                type="submit"
                className={cn(
                  "flex w-full items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors",
                  roundedRect,
                )}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
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
