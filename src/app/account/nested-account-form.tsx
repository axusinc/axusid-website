"use client";

import { useActionState, useState } from "react";
import { createNestedAccountAction, type AuthActionState } from "@/app/actions/auth";
import { SubsectionTitle } from "@/app/account/dashboard-ui";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormError, FormSuccess } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";

type NestedAccountFormProps = {
  auid: string;
};

const initialState: AuthActionState = {};

export function NestedAccountForm({ auid }: NestedAccountFormProps) {
  const [state, formAction, pending] = useActionState(
    createNestedAccountAction,
    initialState,
  );
  const [customContext, setCustomContext] = useState(false);

  return (
    <div className="space-y-6">
      <Card>
        <SubsectionTitle
          title="Create Nested Account"
          description="Register a sub-account created in the context of your user account."
        />

        <form action={formAction} className="mt-6 space-y-4">
          <div className="rounded-lg border border-black/5 bg-neutral-50/80 p-3.5 text-xs text-neutral-600">
            <span className="font-semibold text-black">Parent Context AUID:</span>{" "}
            <code className="font-mono text-neutral-800">{auid}</code>
          </div>

          {!customContext ? (
            <input type="hidden" name="contextAuid" value={auid} />
          ) : (
            <Input
              name="contextAuid"
              label="Context AUID"
              placeholder="Parent AUID"
              defaultValue={auid}
              required
            />
          )}

          <div className="flex items-center gap-2 pb-1">
            <button
              type="button"
              onClick={() => setCustomContext(!customContext)}
              className="text-xs text-neutral-500 underline-offset-4 hover:underline"
            >
              {customContext ? "Use my current AUID" : "Specify custom context AUID"}
            </button>
          </div>

          <Input
            name="username"
            label="Nested Account Username"
            placeholder="e.g. subuser_jane"
            autoComplete="off"
            required
          />

          <Input
            name="password"
            label="Password"
            type="password"
            placeholder="Create password for nested account"
            autoComplete="new-password"
            required
          />

          <Input
            name="confirmPassword"
            label="Confirm Password"
            type="password"
            placeholder="Repeat password"
            autoComplete="new-password"
            required
          />

          {state.error ? <FormError>{state.error}</FormError> : null}
          {state.success ? <FormSuccess>{state.success}</FormSuccess> : null}

          <Button
            type="submit"
            variant="brand"
            className="w-full"
            disabled={pending}
          >
            {pending ? "Creating nested account..." : "Create nested account"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
