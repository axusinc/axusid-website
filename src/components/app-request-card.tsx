import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type RequestingAppInfo = {
  displayName: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
};

type AppRequestCardProps = {
  app: RequestingAppInfo | null | undefined;
  appName: string;
  className?: string;
};

/** Identifies the application that started the current sign-in / consent flow. */
export function AppRequestCard({ app, appName, className }: AppRequestCardProps) {
  const fullName = [app?.firstName, app?.lastName].filter(Boolean).join(" ").trim();
  const name = fullName || app?.displayName || appName;
  const handle = app?.username?.trim().replace(/^@/, "");

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-black/[0.06] bg-white/80 p-3 pr-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
        className,
      )}
    >
      <Avatar
        size="md"
        firstName={app?.firstName}
        lastName={app?.lastName}
        displayName={name}
        seed={app?.username ?? name}
        className="rounded-xl"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-neutral-950">{name}</p>
        {handle ? <p className="truncate text-[13px] text-neutral-500">@{handle}</p> : null}
      </div>
    </div>
  );
}
