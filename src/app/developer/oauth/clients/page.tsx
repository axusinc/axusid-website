import Link from "next/link";
import { listClientsByOwner } from "@/lib/oauth/client-store";
import { requireDeveloperSession } from "@/lib/oauth/developer";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export default async function DeveloperClientsPage() {
  const session = await requireDeveloperSession();
  const clients = await listClientsByOwner(session.auid);

  return (
    <div className="relative min-h-full overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.04),transparent_55%),linear-gradient(180deg,#ffffff_0%,#f5f5f5_100%)]" />

      <header className="relative border-b border-black/5 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <Logo size={36} />
            <p className="text-sm font-medium text-black">Developer apps</p>
          </div>
          <Link href="/account">
            <Button type="button" variant="outline">
              Account
            </Button>
          </Link>
        </div>
      </header>

      <main className="relative mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-black">
              Your OAuth clients
            </h1>
            <p className="mt-2 text-sm text-neutral-500">
              Register redirect URIs so other applications can sign users in with
              AXUS ID.
            </p>
          </div>
          <Link href="/developer/oauth/clients/new">
            <Button variant="brand">Register app</Button>
          </Link>
        </div>

        <div className="mt-8 space-y-4">
          {clients.length === 0 ? (
            <div className="rounded-2xl border border-black/5 bg-white/70 p-8 text-sm text-neutral-500 shadow-[0_8px_32px_rgba(0,0,0,0.06)] backdrop-blur-xl">
              No apps registered yet.
            </div>
          ) : (
            clients.map((client) => (
              <Link
                key={client.clientId}
                href={`/developer/oauth/clients/${client.clientId}`}
                className="block rounded-2xl border border-black/5 bg-white/70 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.06)] backdrop-blur-xl transition hover:border-black/10"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-medium text-black">
                      {client.name}
                    </h2>
                    <p className="mt-2 break-all font-mono text-xs text-neutral-500">
                      {client.clientId}
                    </p>
                  </div>
                  <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600">
                    {client.redirectUris.length} redirect URI
                    {client.redirectUris.length === 1 ? "" : "s"}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
