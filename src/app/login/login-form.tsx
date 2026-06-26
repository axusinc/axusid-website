"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginAction, type AuthActionState } from "@/app/actions/auth";

type LoginFormProps = {
  oauthParams?: Record<string, string>;
  registeredAuid?: string;
};

const initialState: AuthActionState = {};

export function LoginForm({ oauthParams, registeredAuid }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <AuthShell
      title="Sign in"
      description="Authenticate with your AXUS ID to continue."
      footer={
        <>
          New to AXUS ID?{" "}
          <Link href="/register" className="font-medium text-black underline-offset-4 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {registeredAuid ? (
        <div className="mb-6 rounded-xl border border-black/5 bg-neutral-50/80 px-4 py-3 text-sm text-neutral-600 backdrop-blur-sm">
          Account created. Sign in with AUID{" "}
          <span className="font-mono text-black">{registeredAuid}</span>.
        </div>
      ) : null}

      <form action={formAction} className="space-y-4">
        {oauthParams
          ? Object.entries(oauthParams).map(([key, value]) => (
              <input key={key} type="hidden" name={key} value={value} />
            ))
          : null}

        <Input
          name="auid"
          label="AUID"
          placeholder="Your account identifier"
          autoComplete="username"
          required
        />
        <Input
          name="password"
          label="Password"
          type="password"
          placeholder="Enter your password"
          autoComplete="current-password"
          required
        />

        {state.error ? (
          <p className="rounded-xl border border-black/10 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
            {state.error}
          </p>
        ) : null}

        <Button type="submit" variant="brand" className="w-full" disabled={pending}>
          {pending ? "Signing in..." : "Continue"}
        </Button>
      </form>
    </AuthShell>
  );
}
