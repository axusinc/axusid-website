"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAction, type AuthActionState } from "@/app/actions/auth";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";

const initialState: AuthActionState = {};

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(
    registerAction,
    initialState,
  );

  return (
    <AuthShell
      title="Create account"
      description="Register a new AXUS ID to get started."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-black underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form action={formAction} className="space-y-4">
        <Input
          name="username"
          label="Username"
          placeholder="Choose a username"
          autoComplete="username"
          required
        />
        <Input
          name="password"
          label="Password"
          type="password"
          placeholder="Create a password"
          autoComplete="new-password"
          required
        />
        <Input
          name="confirmPassword"
          label="Confirm password"
          type="password"
          placeholder="Repeat your password"
          autoComplete="new-password"
          required
        />

        {state.error ? <FormError>{state.error}</FormError> : null}

        <Button type="submit" variant="brand" className="w-full" disabled={pending}>
          {pending ? "Creating account..." : "Create account"}
        </Button>
      </form>
    </AuthShell>
  );
}
