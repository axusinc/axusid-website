"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Avatar,
  glassSurfaceStrong,
  TextAction,
} from "@/app/account/dashboard-ui";
import { roundedRect } from "@/lib/design";
import { AccountForms } from "./account-forms";
import { VariationForms } from "./variation-forms";

type SectionId = "profile" | "security";

type SectionIconProps = {
  className?: string;
};

function ProfileIcon({ className }: SectionIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function SecurityIcon({ className }: SectionIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

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

const sections: {
  id: SectionId;
  label: string;
  Icon: ({ className }: SectionIconProps) => React.JSX.Element;
}[] = [
  { id: "profile", label: "Profile", Icon: ProfileIcon },
  { id: "security", label: "Security", Icon: SecurityIcon },
];

export function AccountDashboard({
  auid,
  defaultUsername,
  defaultVariation,
  fullName,
  username,
}: AccountDashboardProps) {
  const [active, setActive] = useState<SectionId>("profile");

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-8 lg:flex-row lg:items-start lg:gap-14 lg:px-10 lg:py-10 xl:gap-20">
      {/* Sidebar */}
      <aside className="flex shrink-0 flex-col items-center text-center lg:sticky lg:top-28 lg:w-52 xl:w-56">
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
          )}
          aria-label="Account sections"
        >
          {sections.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActive(id)}
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/10 lg:flex-none",
                roundedRect,
                active === id
                  ? "bg-white/70 text-neutral-900 hover:bg-white/80"
                  : "text-neutral-500 hover:bg-white/40 hover:text-neutral-800",
              )}
              aria-current={active === id ? "page" : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        <div className="mt-6 flex flex-col items-center gap-2">
          <TextAction href="/developer/oauth/clients">Developer apps →</TextAction>
          <TextAction href="/developer/saml">SAML settings →</TextAction>
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
