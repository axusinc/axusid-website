"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Avatar,
  glassSurfaceStrong,
  TextAction,
} from "@/app/account/dashboard-ui";
import { AccountForms } from "./account-forms";
import { VariationForms } from "./variation-forms";

type Variation = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  status: string | null;
  description: string | null;
};

type AccountDashboardProps = {
  auid: string;
  defaultUsername: string | null;
  defaultVariation: Variation | null;
  fullName: string;
  username: string | null;
};

const sections = [
  { id: "profile" as const, label: "Profile" },
  { id: "security" as const, label: "Security" },
];

export function AccountDashboard({
  auid,
  defaultUsername,
  defaultVariation,
  fullName,
  username,
}: AccountDashboardProps) {
  const [active, setActive] = useState<"profile" | "security">("profile");

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-8 lg:flex-row lg:items-start lg:gap-14 lg:px-10 lg:py-10 xl:gap-20">
      {/* Sidebar */}
      <aside className="flex shrink-0 flex-col items-center text-center lg:sticky lg:top-28 lg:w-72 lg:items-start lg:text-left xl:w-80">
        <Avatar
          firstName={defaultVariation?.firstName}
          lastName={defaultVariation?.lastName}
          username={username}
        />

        <h1 className="mt-6 text-2xl font-light tracking-tight text-neutral-900 lg:text-3xl">
          {fullName || "Your account"}
        </h1>

        {username ? (
          <p className="mt-1.5 text-[13px] text-neutral-400">@{username}</p>
        ) : null}

        {defaultVariation?.status ? (
          <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-neutral-500 lg:max-w-none">
            {defaultVariation.status}
          </p>
        ) : null}

        <nav
          className={cn(
            "mt-8 flex w-full flex-row gap-1 p-1 lg:flex-col",
            glassSurfaceStrong,
            "rounded-[16px]",
          )}
          aria-label="Account sections"
        >
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActive(section.id)}
              className={cn(
                "flex-1 rounded-[12px] px-5 py-2.5 text-[13px] font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/10 lg:flex-none lg:text-left",
                active === section.id
                  ? "bg-white/70 text-neutral-900 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-800",
              )}
              aria-current={active === section.id ? "page" : undefined}
            >
              {section.label}
            </button>
          ))}
        </nav>

        <div className="mt-6">
          <TextAction href="/developer/oauth/clients">Developer apps →</TextAction>
        </div>
      </aside>

      {/* Main content */}
      <div key={active} className="min-w-0 flex-1 animate-[fadeIn_0.3s_ease-out]">
        {active === "profile" ? (
          <VariationForms
            defaultVariation={defaultVariation}
            defaultUsername={defaultUsername}
            auid={auid}
          />
        ) : (
          <AccountForms auid={auid} />
        )}
      </div>
    </div>
  );
}
