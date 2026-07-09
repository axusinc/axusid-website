"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DeveloperSection } from "@/app/account/developer-section";
import { Avatar, SectionIntro } from "@/app/account/dashboard-ui";
import { cardSurface, roundedRect } from "@/lib/design";
import type { OAuthClient } from "@/lib/oauth/constants";
import { cn } from "@/lib/utils";
import { AccountForms } from "./account-forms";
import { VariationForms } from "./variation-forms";

type SectionId = "profile" | "security" | "developer";

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

function DeveloperIcon({ className }: SectionIconProps) {
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
      <path d="M16 18 22 12 16 6" />
      <path d="M8 6 2 12 8 18" />
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

type SamlConfig = {
  name: string;
  entityId: string;
  acsUrl: string;
  sloUrl?: string | null;
};

type AccountDashboardProps = {
  auid: string;
  defaultUsername: string | null;
  defaultVariation: Variation | null;
  fullName: string;
  username: string | null;
  clients: OAuthClient[];
  issuer: string;
  samlConfig?: SamlConfig;
};

const sections: {
  id: SectionId;
  label: string;
  Icon: ({ className }: SectionIconProps) => React.JSX.Element;
}[] = [
  { id: "profile", label: "Profile", Icon: ProfileIcon },
  { id: "security", label: "Security", Icon: SecurityIcon },
  { id: "developer", label: "Developer", Icon: DeveloperIcon },
];

function parseSection(value: string | null): SectionId {
  if (value === "security") return "security";
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
  developer: {
    title: "Developer",
    description:
      "Register OAuth 2.0 clients or configure SAML so other applications can authenticate users with AXUS ID.",
  },
};

export function AccountDashboard({
  auid,
  defaultUsername,
  defaultVariation,
  fullName,
  username,
  clients,
  issuer,
  samlConfig,
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
  };

  const handleEditingChange = (editing: boolean) => {
    setIsEditing(editing);
  };

  const sectionNav = (
    <nav
      className={cn(
        "flex w-full flex-col gap-1 p-2",
        cardSurface,
        roundedRect,
        "max-lg:sticky max-lg:top-[73px] max-lg:z-40 max-lg:-mx-6 max-lg:px-6 max-lg:py-2 max-lg:bg-white/70 max-lg:backdrop-blur-xl",
      )}
      aria-label="Account sections"
    >
      {sections.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => handleSectionChange(id)}
          className={cn(
            "inline-flex w-full items-center justify-start gap-2 px-4 py-2.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10",
            roundedRect,
            active === id
              ? "bg-neutral-100 text-black"
              : "text-neutral-500 hover:bg-neutral-50 hover:text-black",
          )}
          aria-current={active === id ? "page" : undefined}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {label}
        </button>
      ))}
    </nav>
  );

  return (
    <div className="flex w-full flex-col gap-6 lg:flex-row lg:items-start lg:gap-14 xl:gap-20">
      <aside className="flex shrink-0 flex-col lg:sticky lg:top-28 lg:w-52 lg:items-center lg:text-center xl:w-56">
        <div className="flex items-center gap-4 lg:flex-col lg:items-center">
          <Avatar
            firstName={defaultVariation?.firstName}
            lastName={defaultVariation?.lastName}
            username={username}
            size="md"
            className="lg:h-24 lg:w-24 lg:text-3xl"
          />

          <div className="min-w-0 text-left lg:mt-6 lg:text-center">
            <h1 className="text-xl font-semibold tracking-tight text-black lg:text-3xl">
              {fullName || "Your account"}
            </h1>
            {username ? (
              <p className="mt-1 text-sm text-neutral-500">@{username}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 lg:mt-8 lg:w-full">{sectionNav}</div>
      </aside>

      <div className="min-w-0 flex-1">
        <SectionIntro
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
              onEditingChange={handleEditingChange}
              cancelRef={securityCancelRef}
            />
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
  );
}
