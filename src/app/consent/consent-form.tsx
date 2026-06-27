"use client";

import { denyConsentAction, consentAction } from "@/app/actions/auth";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";

type ConsentFormProps = {
  clientName: string;
  scopes: string[];
};

export function ConsentForm({ clientName, scopes }: ConsentFormProps) {
  return (
    <AuthShell
      title="Authorize access"
      description={`${clientName} is requesting access to your AXUS ID.`}
    >
      <div className="space-y-6">
        <div className="rounded-xl border border-black/5 bg-white/60 p-4 backdrop-blur-sm">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
            Requested permissions
          </p>
          <ul className="mt-3 space-y-2">
            {scopes.map((scope) => (
              <li
                key={scope}
                className="flex items-center justify-between rounded-lg bg-neutral-50/80 px-3 py-2 text-sm text-neutral-700"
              >
                <span>{scope}</span>
                <span className="text-xs uppercase tracking-wide text-neutral-400">
                  allow
                </span>
              </li>
            ))}
          </ul>
        </div>

        <form action={consentAction} className="space-y-3">
          <Button type="submit" variant="brand" className="w-full">
            Allow access
          </Button>
        </form>

        <form action={denyConsentAction}>
          <Button type="submit" variant="outline" className="w-full">
            Deny
          </Button>
        </form>
      </div>
    </AuthShell>
  );
}
