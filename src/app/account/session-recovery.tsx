"use client";

import { useEffect, useRef, useState } from "react";
import { discardInvalidSessionAction } from "@/app/actions/auth";

export function SessionRecovery({ auid }: { auid: string }) {
  const [failed, setFailed] = useState(false);
  const started = useRef(false);
  const active = useRef(false);

  const recoveryUrl = `/auth/session-recovery?auid=${encodeURIComponent(auid)}`;

  useEffect(() => {
    active.current = true;
    if (started.current) return () => { active.current = false; };
    started.current = true;
    discardInvalidSessionAction(auid)
      .catch(() => {
        if (active.current) {
          setFailed(true);
          window.location.replace(recoveryUrl);
        }
      });
    return () => {
      active.current = false;
    };
  }, [auid, recoveryUrl]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">Your session ended</h1>
      <p className="text-sm text-neutral-600">
        {failed ? "We couldn’t finish signing you out." : "Taking you to sign in…"}
      </p>
      <a href={recoveryUrl} className="text-sm underline text-neutral-800 hover:text-black">
        {failed ? "Sign in again" : "Click here if you are not redirected"}
      </a>
    </main>
  );
}
