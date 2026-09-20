"use client";

import { UsersRound } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { createNestedAccountAction, type AuthActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { FormError, FormSuccess } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { focusRing } from "@/lib/design";
import { cn } from "@/lib/utils";

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
  const [showPasswords, setShowPasswords] = useState(false);
  const registrationKeyInputRef = useRef<HTMLInputElement>(null);

  return (
    <Card>
      <CardHeader
        icon={<UsersRound aria-hidden />}
        title="Create a nested account"
        description="A nested account is a separate identity with its own username and password, owned by a parent account."
      />

      <form
        action={formAction}
        className="mt-6 space-y-4 border-t border-black/[0.05] pt-6"
        onSubmit={() => {
          if (
            registrationKeyInputRef.current &&
            !registrationKeyInputRef.current.value
          ) {
            registrationKeyInputRef.current.value = crypto.randomUUID();
          }
        }}
      >
        <input
          key={state.registrationKey || "new-registration"}
          ref={registrationKeyInputRef}
          type="hidden"
          name="registrationKey"
          defaultValue={state.registrationKey || ""}
        />

        {customContext ? (
          <Input
            id="nested-context"
            name="contextAuid"
            label="Parent account AUID"
            placeholder="Parent AUID"
            defaultValue={auid}
            className="font-mono text-[13px]"
            required
          />
        ) : (
          <div>
            <input type="hidden" name="contextAuid" value={auid} />
            <p className="text-sm font-medium text-neutral-800">Parent account</p>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-neutral-500">
              This account
              <code className="rounded-md bg-neutral-100 px-1.5 py-0.5 font-mono text-xs text-neutral-700">
                {auid}
              </code>
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={() => setCustomContext(!customContext)}
          className={cn("rounded-sm text-[13px] font-medium text-neutral-500 underline-offset-4 hover:text-neutral-900 hover:underline", focusRing)}
        >
          {customContext ? "Use this account as the parent" : "Use a different parent account"}
        </button>

        <Input
          id="nested-username"
          name="username"
          label="Username"
          hint="Optional. Leave blank to get a random username."
          placeholder="nested-username"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          minLength={4}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <PasswordInput
            id="nested-password"
            name="password"
            label="Password"
            placeholder="Create a password"
            autoComplete="new-password"
            visible={showPasswords}
            onVisibleChange={setShowPasswords}
            required
          />
          <PasswordInput
            id="nested-confirm-password"
            name="confirmPassword"
            label="Confirm password"
            placeholder="Repeat the password"
            autoComplete="new-password"
            visible={showPasswords}
            onVisibleChange={setShowPasswords}
            required
          />
        </div>

        {state.error ? <FormError>{state.error}</FormError> : null}
        {state.success ? <FormSuccess>{state.success}</FormSuccess> : null}

        <Button type="submit" size="md" loading={pending}>
          {pending ? "Creating…" : "Create nested account"}
        </Button>
      </form>
    </Card>
  );
}
