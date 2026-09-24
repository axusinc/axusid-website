"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AppWindow, KeyRound, Code2, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  ConnectedAppsSection,
  type ConnectedApp,
} from "@/app/account/connected-apps-section";
import { PermissionsSection } from "./permissions-section";
import { DeveloperSection } from "@/app/account/developer-section";
import { SectionIntro } from "@/app/account/dashboard-ui";
import { BrandMark } from "@/components/brand-mark";
import { PageBackground } from "@/components/page-background";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { UserAccountSwitcher } from "@/components/user-account-switcher";
import { focusRing } from "@/lib/design";
import type { OAuthClient } from "@/lib/oauth/constants";
import type { PasskeyCredential } from "@/lib/passkey-graphql";
import { cn } from "@/lib/utils";
import type { AccountItemInfo } from "@/lib/user-profile";
import type { ProfileName } from "@/lib/profile-name";
import { AccountForms } from "./account-forms";
import { NestedAccountForm } from "./nested-account-form";
import { VariationForms } from "./variation-forms";

import type { ExternalIdentity } from "@/lib/google-oauth";

type SectionId =
  | "permissions"
  | "profile"
  | "security"
  | "connected-apps"
  | "nested-accounts"
  | "developer";

type Variation = {
  id: string;
  name: ProfileName | null;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  status: string | null;
  description: string | null;
  avatarUrl: string | null;
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
  connectedApps: ConnectedApp[];
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
  { id: "permissions", label: "Permissions", Icon: KeyRound },
  { id: "security", label: "Security", Icon: ShieldCheck },
  { id: "connected-apps", label: "Connected apps", Icon: AppWindow },
  { id: "nested-accounts", label: "Nested accounts", Icon: UsersRound },
  { id: "developer", label: "Developer", Icon: Code2 },
];

function parseSection(value: string | null): SectionId {
  if (value === "permissions") return "permissions";
  if (value === "security") return "security";
  if (value === "connected-apps") return "connected-apps";
  if (value === "nested-accounts") return "nested-accounts";
  if (value === "developer") return "developer";
  return "profile";
}

const sectionMeta: Record<SectionId, { title: string; description: string }> = {
  permissions: { title: "Permissions", description: "See who you’ve shared access with and manage your permissions." },
  profile: {
    title: "Profile",
    description:
      "Your name, username and public details. Apps you sign in to can see what you allow them to.",
  },
  security: {
    title: "Security",
    description: "Manage the ways you sign in. We recommend adding a passkey — it’s faster and can’t be phished.",
  },
  "connected-apps": {
    title: "Connected apps",
    description:
      "Applications you have given access to your account, and what they may do with it.",
  },
  "nested-accounts": {
    title: "Nested accounts",
    description:
      "Create separate identities that live under your account — for projects, teams or devices.",
  },
  developer: {
    title: "Developer",
    description:
      "Let your applications sign users in with AXUS ID using OAuth 2.0 / OpenID Connect or SAML.",
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
  connectedApps,
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEditingChange = (editing: boolean) => {
    setIsEditing(editing);
  };

  const sectionNav = (
    <nav
      className="mobile-scrollbar-hidden -mx-4 flex gap-1 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0"
      aria-label="Account sections"
    >
      {sections.map(({ id, label, Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => handleSectionChange(id)}
            className={cn(
              "group relative inline-flex h-10 shrink-0 cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-xl px-3 text-sm font-medium transition-colors lg:w-full",
              focusRing,
              isActive
                ? "bg-white text-neutral-950 shadow-[0_1px_2px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.06]"
                : "text-neutral-500 hover:bg-black/[0.04] hover:text-neutral-900",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon
              className={cn(
                "h-4 w-4 shrink-0 transition-colors",
                isActive ? "text-brand" : "text-neutral-400 group-hover:text-neutral-600",
              )}
              strokeWidth={1.9}
              aria-hidden
            />
            {label}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="relative flex min-h-[100dvh] flex-1 flex-col">
      <PageBackground />

      <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-[#fafafa]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <BrandMark size={28} />
          <UserAccountSwitcher accounts={accounts} currentAuid={currentAuid} />
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-6 sm:px-6 sm:pt-10 lg:grid lg:grid-cols-[232px_minmax(0,1fr)] lg:gap-12">
        <aside className="lg:sticky lg:top-26 lg:self-start">
          <div className="flex items-center gap-3.5 lg:block">
            <ProfileAvatar
              imageUrl={defaultVariation?.avatarUrl}
              alt={fullName || username || "Profile photo"}
              firstName={defaultVariation?.firstName}
              lastName={defaultVariation?.lastName}
              displayName={fullName}
              username={username}
              seed={auid}
              fetchPriority="high"
              size="lg"
              className="lg:h-16 lg:w-16 lg:text-xl"
            />
            <div className="min-w-0 lg:mt-4">
              <p className="truncate text-lg font-semibold tracking-tight text-neutral-950">
                {fullName || (username ? `@${username}` : "Your account")}
              </p>
              {username && fullName ? (
                <p className="truncate text-sm text-neutral-500">@{username}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-5 border-b border-black/[0.06] pb-3 lg:mt-7 lg:border-0 lg:pb-0">{sectionNav}</div>
        </aside>

        <main className="min-w-0 pt-7 lg:pt-0">
          <SectionIntro
            title={sectionMeta[active].title}
            description={sectionMeta[active].description}
          />

          <div key={active} className="animate-[fadeIn_0.25s_ease-out]">
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
            ) : active === "permissions" ? (
              <PermissionsSection key={auid} onEditingChange={handleEditingChange} />
            ) : active === "connected-apps" ? (
              <ConnectedAppsSection apps={connectedApps} />
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
        </main>
      </div>
    </div>
  );
}
