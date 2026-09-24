"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BrandMark, SiteFooter } from "@/components/brand-mark";
import { PageBackground } from "@/components/page-background";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { focusRing } from "@/lib/design";
import { cn } from "@/lib/utils";

type CheckState = {
  path: string;
  label: string;
  status: "checking" | "ok" | "fail";
  ms?: number;
  detail?: string;
};

const CHECKS = [
  { path: "/.well-known/openid-configuration", label: "Discovery document" },
  { path: "/.well-known/jwks.json", label: "JWKS (signing keys)" },
  { path: "/oauth/userinfo", label: "Userinfo endpoint" },
];

async function runCheck(origin: string, path: string, label: string): Promise<CheckState> {
  const started = performance.now();
  try {
    // Userinfo needs a token, so 401 proves it's alive and speaking OIDC.
    const res = await fetch(origin + path, { cache: "no-store" });
    const ms = Math.round(performance.now() - started);
    if (path === "/oauth/userinfo") {
      return res.status === 401
        ? { path, label, status: "ok", ms, detail: "401 without a token — exactly as specified" }
        : { path, label, status: "fail", ms, detail: `Unexpected status ${res.status}` };
    }
    if (!res.ok) return { path, label, status: "fail", ms, detail: `HTTP ${res.status}` };
    await res.json();
    return { path, label, status: "ok", ms, detail: "Valid JSON response" };
  } catch (error) {
    return {
      path,
      label,
      status: "fail",
      ms: Math.round(performance.now() - started),
      detail: error instanceof Error ? error.message : "Unreachable",
    };
  }
}

export function StatusChecker() {
  const [checks, setChecks] = useState<CheckState[]>(
    CHECKS.map((c) => ({ ...c, status: "checking" })),
  );
  const [at, setAt] = useState<Date | null>(null);

  const run = useCallback(async () => {
    setChecks(CHECKS.map((c) => ({ ...c, status: "checking" as const })));
    const results = await Promise.all(
      CHECKS.map((c) => runCheck(window.location.origin, c.path, c.label)),
    );
    setChecks(results);
    setAt(new Date());
  }, []);

  useEffect(() => {
    let alive = true;
    Promise.all(CHECKS.map((c) => runCheck(window.location.origin, c.path, c.label))).then(
      (results) => {
        if (!alive) return;
        setChecks(results);
        setAt(new Date());
      },
    );
    return () => {
      alive = false;
    };
  }, []);

  const failed = checks.filter((c) => c.status === "fail").length;
  const checking = checks.some((c) => c.status === "checking");
  const headline = checking
    ? "Checking endpoints…"
    : failed === 0
      ? "All endpoints responding"
      : `${failed} of ${checks.length} endpoints failing`;

  return (
    <div className="relative flex min-h-[100dvh] flex-1 flex-col">
      <PageBackground />
      <header className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between gap-4 px-4 sm:h-20 sm:px-6">
        <BrandMark size={30} />
        <Link
          href="/"
          className={cn("text-sm font-medium text-neutral-800 underline underline-offset-4 hover:text-neutral-950", focusRing)}
        >
          Home
        </Link>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Trust</p>
        <h1 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.03em] text-neutral-950 sm:text-4xl">
          Status
        </h1>
        <p className="mt-4 max-w-2xl text-pretty text-[15px] leading-relaxed text-neutral-500">
          No status badges copied from somewhere — these checks run from your browser against
          this very deployment, right now.
        </p>

        <section aria-label="Endpoint status" className="mt-8 rounded-[20px] border border-black/[0.07] bg-white p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2.5 text-[15px] font-semibold text-neutral-950" role="status">
              <span
                aria-hidden
                className={cn(
                  "h-2.5 w-2.5 rounded-full",
                  checking ? "animate-pulse bg-neutral-400" : failed === 0 ? "bg-emerald-500" : "bg-red-500",
                )}
              />
              {checking ? <Spinner /> : null}
              {headline}
            </p>
            <Button size="sm" variant="secondary" onClick={run} disabled={checking}>
              Re-check
            </Button>
          </div>

          <ul className="mt-5 divide-y divide-black/[0.05]">
            {checks.map((check) => (
              <li key={check.path} className="flex items-start justify-between gap-3 py-3.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-900">{check.label}</p>
                  <p className="mt-0.5 truncate font-mono text-xs text-neutral-400">{check.path}</p>
                  {check.status !== "checking" && check.detail ? (
                    <p className="mt-1 text-[13px] text-neutral-500">{check.detail}</p>
                  ) : null}
                </div>
                <p className={cn(
                  "shrink-0 rounded-lg px-2 py-1 font-mono text-xs",
                  check.status === "checking" && "bg-neutral-100 text-neutral-500",
                  check.status === "ok" && "bg-emerald-50 text-emerald-700",
                  check.status === "fail" && "bg-red-50 text-red-600",
                )}>
                  {check.status === "checking" ? "…" : check.status === "ok" ? `${check.ms}ms` : "fail"}
                </p>
              </li>
            ))}
          </ul>

          {at ? (
            <p className="mt-5 text-xs text-neutral-400">
              Checked at {at.toLocaleTimeString()} from your browser. No history yet — uptime
              tracking starts when someone asks for it.
            </p>
          ) : null}
        </section>
      </main>

      <SiteFooter className="pb-10" />
    </div>
  );
}
