"use client";

import { useMemo, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { focusRing } from "@/lib/design";
import { cn } from "@/lib/utils";
import type { AccountItemInfo } from "@/lib/user-profile";

/** Relevance score for ranking — nothing is ever filtered out. */
function rankScore(a: AccountItemInfo, q: string): number {
  if (!q) return a.isActive ? 0 : 1;
  const uname = (a.username ?? "").toLowerCase();
  const auid = a.auid.toLowerCase();
  const name = a.displayName.toLowerCase();
  if (uname && uname === q) return 0;
  if (uname.startsWith(q) || name.startsWith(q)) return 1;
  if (auid.startsWith(q)) return 2;
  if (uname.includes(q) || name.includes(q) || auid.includes(q)) return 3;
  return 4;
}

function accountLabel(a: AccountItemInfo) {
  return a.username ? `@${a.username}` : a.displayName;
}

/**
 * An AUID field that almost never requires typing a raw AUID: account card
 * when the value matches a signed-in account, avatar quick-pick when empty,
 * and a ranked (never filtered) dropdown while typing.
 */
export function AuidField({
  id = "auid",
  label = "Client ID · your AUID",
  value,
  onChange,
  accounts = [],
  placeholder = "Paste your AUID",
  invalid = false,
}: {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  accounts?: AccountItemInfo[];
  placeholder?: string;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const suppressOpen = useRef(false);

  const query = value.trim().toLowerCase();
  const rankedAccounts = useMemo(() => {
    const scored = accounts.map((account) => ({ account, score: rankScore(account, query) }));
    scored.sort(
      (x, y) =>
        x.score - y.score ||
        Number(y.account.isActive) - Number(x.account.isActive) ||
        x.account.displayName.localeCompare(y.account.displayName),
    );
    return scored.map((s) => s.account);
  }, [accounts, query]);
  const showDropdown = open && rankedAccounts.length > 0;
  const highlighted = showDropdown
    ? rankedAccounts[Math.min(highlight, rankedAccounts.length - 1)]
    : undefined;

  const openDropdown = () => {
    setHighlight(0);
    setOpen(true);
  };

  const chooseAccount = (auid: string) => {
    onChange(auid);
    setHighlight(0);
    setOpen(false);
  };

  const matched = value.trim() ? (accounts.find((a) => a.auid === value.trim()) ?? null) : null;
  const showAvatars = !value && !open && accounts.length > 0;
  const inputId = `${id}-input`;
  const listId = `${id}-list`;

  return (
    <div>
      <span id={`${id}-label`} className="text-xs font-medium text-neutral-700">
        {label}
      </span>
      {matched ? (
        <div
          aria-live="polite"
          className="mt-2 flex h-11 items-center gap-2.5 rounded-xl border border-black/10 bg-white pl-1.5 pr-1.5"
        >
          <ProfileAvatar
            size="sm"
            imageUrl={matched.avatarUrl}
            alt={matched.displayName}
            firstName={matched.firstName}
            lastName={matched.lastName}
            displayName={matched.displayName}
            username={matched.username}
            seed={matched.auid}
          />
          <span className="min-w-0 flex-1 truncate text-[13px]">
            <span className="font-medium text-neutral-900">{accountLabel(matched)}</span>{" "}
            <span className="font-mono text-[11px] text-neutral-400" title={matched.auid}>
              {matched.auid}
            </span>
          </span>
          <button
            type="button"
            onClick={() => {
              onChange("");
              openDropdown();
              requestAnimationFrame(() => inputRef.current?.focus());
            }}
            aria-label="Clear client ID"
            className={cn(
              "inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-black/[0.05] hover:text-neutral-900",
              focusRing,
            )}
          >
            <X aria-hidden className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div
          className="relative mt-2"
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
              setOpen(false);
            }
          }}
        >
          <label className="sr-only" htmlFor={inputId}>
            {label}
          </label>
          <input
            ref={inputRef}
            id={inputId}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              openDropdown();
            }}
            onFocus={() => {
              if (suppressOpen.current) {
                suppressOpen.current = false;
                return;
              }
              openDropdown();
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setOpen(false);
                return;
              }
              if (!rankedAccounts.length) return;
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                if (!open) {
                  openDropdown();
                  return;
                }
                const dir = e.key === "ArrowDown" ? 1 : -1;
                setHighlight((h) => (h + dir + rankedAccounts.length) % rankedAccounts.length);
              } else if (e.key === "Enter" && open && highlighted) {
                e.preventDefault();
                chooseAccount(highlighted.auid);
              }
            }}
            role={accounts.length > 0 ? "combobox" : undefined}
            aria-expanded={accounts.length > 0 ? showDropdown : undefined}
            aria-controls={accounts.length > 0 ? listId : undefined}
            aria-autocomplete={accounts.length > 0 ? "list" : undefined}
            aria-activedescendant={highlighted ? `${id}-opt-${highlighted.auid}` : undefined}
            placeholder={placeholder}
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={invalid}
            className={cn(
              "h-11 w-full rounded-xl border border-black/10 bg-white px-3 font-mono text-[13px] text-neutral-900 placeholder:text-neutral-400",
              focusRing,
              showAvatars && "pr-24",
            )}
          />
          {showAvatars ? (
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center">
              {accounts.slice(0, 4).map((account) => (
                <button
                  key={account.auid}
                  type="button"
                  onMouseDown={() => {
                    suppressOpen.current = true;
                  }}
                  onClick={() => chooseAccount(account.auid)}
                  aria-label={`Use ${accountLabel(account)} as the client ID`}
                  title={accountLabel(account)}
                  className={cn(
                    "-ml-2 rounded-full ring-2 ring-white transition-transform first:ml-0 hover:-translate-y-0.5",
                    focusRing,
                  )}
                >
                  <ProfileAvatar
                    size="xs"
                    imageUrl={account.avatarUrl}
                    alt=""
                    firstName={account.firstName}
                    lastName={account.lastName}
                    displayName={account.displayName}
                    username={account.username}
                    seed={account.auid}
                  />
                </button>
              ))}
              {accounts.length > 4 ? (
                <button
                  type="button"
                  onMouseDown={() => {
                    suppressOpen.current = true;
                  }}
                  onClick={() => inputRef.current?.focus()}
                  aria-label={`Show all ${accounts.length} accounts`}
                  className={cn(
                    "-ml-2 flex h-6 items-center rounded-full bg-neutral-950 px-2 text-[10px] font-medium text-white ring-2 ring-white",
                    focusRing,
                  )}
                >
                  +{accounts.length - 4}
                </button>
              ) : null}
            </div>
          ) : null}
          {showDropdown ? (
            <div className="absolute inset-x-0 top-full z-20 mt-1.5 overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-[0_12px_32px_rgba(0,0,0,0.12)]">
              <p className="border-b border-black/[0.05] px-3 py-2 text-[11px] font-medium text-neutral-400">
                Signed in on this device
              </p>
              <ul id={listId} role="listbox" aria-label="Signed-in accounts" className="max-h-56 overflow-y-auto p-1.5">
                {rankedAccounts.map((account) => {
                  const selected = value.trim() === account.auid;
                  const isHighlight = highlighted?.auid === account.auid;
                  return (
                    <li
                      key={account.auid}
                      id={`${id}-opt-${account.auid}`}
                      role="option"
                      aria-selected={selected}
                    >
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => chooseAccount(account.auid)}
                        className={cn(
                          "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors",
                          focusRing,
                          isHighlight
                            ? "bg-black/[0.06]"
                            : selected
                              ? "bg-brand/[0.06]"
                              : "hover:bg-black/[0.04]",
                        )}
                      >
                        <ProfileAvatar
                          imageUrl={account.avatarUrl}
                          alt={account.displayName}
                          firstName={account.firstName}
                          lastName={account.lastName}
                          displayName={account.displayName}
                          username={account.username}
                          seed={account.auid}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-neutral-900">
                            {accountLabel(account)}
                          </span>
                          <span className="block truncate font-mono text-[11px] text-neutral-400">
                            {account.auid}
                          </span>
                        </span>
                        {selected ? (
                          <Check aria-hidden className="h-3.5 w-3.5 shrink-0 text-brand" strokeWidth={2.5} />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
