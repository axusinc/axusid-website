"use client";

import { useState } from "react";
import { CodeBlock } from "@/components/ui/code-block";
import { focusRing } from "@/lib/design";
import { cn } from "@/lib/utils";

/** Tailored .env.local snippet with local state — no shared context needed. */
export function EnvConfig({ issuer }: { issuer: string }) {
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
        <label className="text-xs font-medium text-neutral-700">
          Client ID · your AUID
          <input
            value={client}
            onChange={(e) => setClient(e.target.value)}
            placeholder="Paste from Developer settings"
            autoCapitalize="none"
            spellCheck={false}
            className={inputClass}
          />
        </label>
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
