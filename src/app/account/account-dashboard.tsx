"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Code2, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DeveloperSection } from "@/app/account/developer-section";
import { Avatar, SectionIntro } from "@/app/account/dashboard-ui";
import { Logo } from "@/components/ui/logo";
import { UserAccountSwitcher } from "@/components/user-account-switcher";
import type { OAuthClient } from "@/lib/oauth/constants";
import type { PasskeyCredential } from "@/lib/passkey-graphql";
import { cn } from "@/lib/utils";
import type { AccountItemInfo } from "@/lib/user-profile";
import type { ProfileName } from "@/lib/profile-name";
import { AccountForms } from "./account-forms";
import { NestedAccountForm } from "./nested-account-form";
import { VariationForms } from "./variation-forms";

import type { ExternalIdentity } from "@/lib/google-oauth";

type SectionId = "profile" | "security" | "nested-accounts" | "developer";

type Variation = {
  id: string;
  name: ProfileName | null;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  status: string | null;
  description: string | null;
};

type SamlConfig = {
  name: string;
  entityId: string;
  acsUrl: string;
  sloUrl?: string | null;
};

type AccountDashboardProps = {
  auid: string;
  accounts: AccountItemInfo[];
  currentAuid: string;
  defaultUsername: string | null;
  defaultVariation: Variation | null;
  fullName: string;
  username: string | null;
  clients: OAuthClient[];
  issuer: string;
  samlConfig?: SamlConfig;
  initialPasskeys?: PasskeyCredential[];
  initialExternalIdentities?: ExternalIdentity[];
  initialHasPassword: boolean;
};

const sections: {
  id: SectionId;
  label: string;
  Icon: typeof UserRound;
}[] = [
  { id: "profile", label: "Profile", Icon: UserRound },
  { id: "security", label: "Security", Icon: ShieldCheck },
  { id: "nested-accounts", label: "Nested accounts", Icon: UsersRound },
  { id: "developer", label: "Developer", Icon: Code2 },
];

function parseSection(value: string | null): SectionId {
  if (value === "security") return "security";
  if (value === "nested-accounts") return "nested-accounts";
  if (value === "developer") return "developer";
  return "profile";
}

const sectionMeta: Record<SectionId, { title: string; description: string }> = {
  profile: {
    title: "Profile",
    description:
      "Your name, username, and public details. Apps you sign in to can read this information.",
  },
  security: {
    title: "Security",
    description: "Manage how you sign in to your AXUS ID account.",
  },
  "nested-accounts": {
    title: "Nested accounts",
    description:
      "Create sub-accounts in the context of your user account.",
  },
  developer: {
    title: "Developer",
    description:
      "Register OAuth 2.0 clients or configure SAML so other applications can authenticate users with AXUS ID.",
  },
};

export function AccountDashboard({
  auid,
  accounts,
  currentAuid,
  defaultUsername,
  defaultVariation,
  fullName,
  username,
  clients,
  issuer,
  samlConfig,
  initialPasskeys = [],
  initialExternalIdentities = [],
  initialHasPassword,
}: AccountDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [active, setActive] = useState<SectionId>(() =>
    parseSection(searchParams.get("section")),
  );
  const [isEditing, setIsEditing] = useState(false);
  const profileCancelRef = useRef<(() => void) | null>(null);
  const securityCancelRef = useRef<(() => void) | null>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActive(parseSection(searchParams.get("section")));
  }, [searchParams]);

  const handleSectionChange = (section: SectionId) => {
    if (section === active) {
      return;
    }

    if (isEditing) {
      const confirmed = window.confirm("Discard unsaved changes?");
      if (!confirmed) {
        return;
      }

      if (active === "profile") {
        profileCancelRef.current?.();
      } else if (active === "security") {
        securityCancelRef.current?.();
      }
      setIsEditing(false);
    }

    setActive(section);
    router.replace(`/account?section=${section}`, { scroll: false });
    mainContentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEditingChange = (editing: boolean) => {
    setIsEditing(editing);
  };

  const sectionNav = (
    <nav
      className="mobile-scrollbar-hidden flex w-full snap-x snap-mandatory gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0"
      aria-label="Account sections"
    >
      {sections.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => handleSectionChange(id)}
          className={cn(
            "group inline-flex min-h-11 shrink-0 snap-start items-center justify-start gap-2.5 rounded-[12px] border px-3.5 py-2.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/5 lg:min-h-0 lg:w-full lg:px-4",
            active === id
              ? "border-black/[0.07] bg-white text-black shadow-sm"
              : "border-transparent text-neutral-500 hover:bg-black/[0.035] hover:text-black",
          )}
          aria-current={active === id ? "page" : undefined}
        >
          <Icon
            className={cn(
              "h-4 w-4 shrink-0 transition-colors",
              active === id ? "text-brand" : "text-neutral-400 group-hover:text-neutral-600",
            )}
            strokeWidth={1.8}
            aria-hidden
          />
          {label}
        </button>
      ))}
    </nav>
  );

  return (
    <section className="relative min-h-screen w-full bg-white/85 backdrop-blur-2xl lg:h-screen lg:overflow-hidden lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="relative z-30 isolate border-b border-black/[0.06] bg-neutral-50/80 px-4 py-4 sm:px-7 sm:py-7 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-7 lg:py-8 custom-scrollbar">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand/[0.07] blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-black/[0.04] blur-3xl" />
        </div>

        <div className="relative flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <Logo size={42} />
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              AXUS ID
            </span>
          </div>
          <div className="lg:hidden">
            <UserAccountSwitcher accounts={accounts} currentAuid={currentAuid} />
          </div>
        </div>

        <div className="relative mt-5 flex items-center gap-3.5 shrink-0 sm:mt-8 sm:gap-4 lg:mt-14 lg:block">
          <Avatar
            firstName={defaultVariation?.firstName}
            lastName={defaultVariation?.lastName}
            username={username}
            size="md"
            className="h-12 w-12 ring-[3px] ring-black/[0.04] sm:h-14 sm:w-14 lg:h-20 lg:w-20"
          />

          <div className="min-w-0 lg:mt-5">
            <p className="mb-1.5 hidden text-[11px] font-semibold uppercase tracking-[0.16em] text-brand lg:block">
              Your account
            </p>
            <h1 className="truncate text-xl font-semibold tracking-[-0.025em] text-black lg:text-2xl">
              {fullName || "Your account"}
            </h1>
            {username ? (
              <p className="mt-1 truncate text-sm text-neutral-500">@{username}</p>
            ) : null}
          </div>
        </div>

        <div className="relative mt-4 shrink-0 sm:mt-6 lg:mt-9">{sectionNav}</div>

        <div className="relative mt-auto hidden shrink-0 border-t border-black/[0.06] pt-6 lg:block">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
            Signed in as
          </p>
          <UserAccountSwitcher accounts={accounts} currentAuid={currentAuid} direction="up" align="left" />
        </div>
      </aside>

      <div ref={mainContentRef} className="min-w-0 px-4 py-6 sm:px-7 sm:py-9 lg:h-screen lg:overflow-y-auto lg:px-10 lg:py-10 xl:px-12 xl:py-12 custom-scrollbar">
        <div className="mx-auto w-full max-w-4xl">
          <SectionIntro
            eyebrow="Account settings"
            title={sectionMeta[active].title}
            description={sectionMeta[active].description}
          />

          <div key={active} className="animate-[fadeIn_0.3s_ease-out]">
            {active === "profile" ? (
              <VariationForms
                defaultVariation={defaultVariation}
                defaultUsername={defaultUsername}
                auid={auid}
                onEditingChange={handleEditingChange}
                cancelRef={profileCancelRef}
              />
            ) : active === "security" ? (
              <AccountForms
                auid={auid}
                initialPasskeys={initialPasskeys}
                initialExternalIdentities={initialExternalIdentities}
                initialHasPassword={initialHasPassword}
                onEditingChange={handleEditingChange}
                cancelRef={securityCancelRef}
              />
            ) : active === "nested-accounts" ? (
              <NestedAccountForm auid={auid} />
            ) : (
              <DeveloperSection
                auid={auid}
                issuer={issuer}
                clients={clients}
                samlConfig={samlConfig}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
