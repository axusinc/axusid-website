"use client";

import { useState } from "react";
import { AuidField } from "@/components/ui/auid-field";
import { CodeBlock } from "@/components/ui/code-block";
import { focusRing } from "@/lib/design";
import { cn } from "@/lib/utils";
import type { AccountItemInfo } from "@/lib/user-profile";

/** Tailored .env.local snippet with local state — no shared context needed. */
export function EnvConfig({
  issuer,
  accounts = [],
}: {
  issuer: string;
  accounts?: AccountItemInfo[];
}) {
  const [client, setClient] = useState("");
  const [redirect, setRedirect] = useState("http://localhost:3000/api/auth/axus/callback");

  const inputClass = cn(
    "mt-2 h-11 w-full rounded-xl border border-black/10 bg-white px-3 font-mono text-xs text-neutral-900 placeholder:text-neutral-400",
    focusRing,
  );

  const code = `AXUS_ISSUER=${JSON.stringify(issuer)}\nAXUS_CLIENT_ID=${JSON.stringify(client.trim() || "YOUR_AUID")}\nAXUS_REDIRECT_URI=${JSON.stringify(redirect)}`;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <AuidField
          id="env-client"
          value={client}
          onChange={setClient}
          accounts={accounts}
          placeholder="Paste from Developer settings"
        />
        <label className="text-xs font-medium text-neutral-700">
          Callback URL
          <input
            value={redirect}
            onChange={(e) => setRedirect(e.target.value)}
            autoCapitalize="none"
            spellCheck={false}
            className={inputClass}
          />
        </label>
      </div>
      <CodeBlock label=".env.local · in your app" code={code} />
    </div>
  );
}
