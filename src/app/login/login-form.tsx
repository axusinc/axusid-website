"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { loginAction, type AuthActionState } from "@/app/actions/auth";

type LoginFormProps = {
  isOAuthFlow?: boolean;
  registeredUsername?: string;
};

const initialState: AuthActionState = {};

export function LoginForm({ isOAuthFlow, registeredUsername }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <AuthShell
      title="Sign in"
      description={
        isOAuthFlow
          ? "Sign in to continue authorizing the application."
          : "Sign in with your username and password."
      }
      footer={
        <>
          New to AXUS ID?{" "}
          <Link href="/register" className="font-medium text-black underline-offset-4 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {registeredUsername ? (
        <div className="mb-6 rounded-xl border border-black/5 bg-neutral-50/80 px-4 py-3 text-sm text-neutral-600 backdrop-blur-sm">
          Account created. Sign in with username{" "}
          <span className="font-medium text-black">{registeredUsername}</span>.
        </div>
      ) : null}

      <form action={formAction} className="space-y-4">
        <Input
          name="username"
          label="Username"
          placeholder="Your username"
          autoComplete="username"
          defaultValue={registeredUsername}
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

        {state.error ? <FormError>{state.error}</FormError> : null}

        <Button type="submit" variant="brand" className="w-full" disabled={pending}>
          {pending ? "Signing in..." : "Continue"}
        </Button>
      </form>
    </AuthShell>
  );
}
