"use client";

import { useEffect, useRef, useState } from "react";
import { discardInvalidSessionAction } from "@/app/actions/auth";

export function SessionRecovery({ auid }: { auid: string }) {
  const [failed, setFailed] = useState(false);
  const started = useRef(false);
  const active = useRef(false);

  useEffect(() => {
    active.current = true;
    if (started.current) return () => { active.current = false; };
    started.current = true;
    discardInvalidSessionAction(auid)
      .then((destination) => {
        if (active.current) window.location.replace(destination);
      })
      .catch(() => {
        if (active.current) setFailed(true);
      });
    return () => {
      active.current = false;
    };
  }, [auid]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">Your session ended</h1>
      <p className="text-sm text-neutral-600">
        {failed ? "We couldn’t finish signing you out. Reload to try again." : "Taking you to sign in…"}
      </p>
      {failed ? <button type="button" onClick={() => window.location.reload()} className="underline">Reload</button> : null}
    </main>
  );
}
