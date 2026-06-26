"use client";

import { useActionState } from "react";
import {
  addUsernameAction,
  changePasswordAction,
  type AuthActionState,
} from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { FormError, FormSuccess } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";

type AccountFormsProps = {
  auid: string;
};

const initialState: AuthActionState = {};

export function AccountForms({ auid }: AccountFormsProps) {
  const [usernameState, addUsername, addingUsername] = useActionState(
    addUsernameAction,
    initialState,
  );
  const [passwordState, changePassword, changingPassword] = useActionState(
    changePasswordAction,
    initialState,
  );

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-black/5 bg-white/70 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.06)] backdrop-blur-xl">
        <h2 className="text-lg font-semibold text-black">Add username</h2>
        <form action={addUsername} className="mt-4 space-y-4">
          <input type="hidden" name="auid" value={auid} />
          <Input name="username" label="Username" placeholder="new.username" required />
          {usernameState.error ? (
            <FormError>{usernameState.error}</FormError>
          ) : null}
          {usernameState.success ? (
            <FormSuccess>{usernameState.success}</FormSuccess>
          ) : null}
          <Button type="submit" className="w-full" disabled={addingUsername}>
            {addingUsername ? "Adding..." : "Add username"}
          </Button>
        </form>
      </section>

      <section className="rounded-2xl border border-black/5 bg-white/70 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.06)] backdrop-blur-xl">
        <h2 className="text-lg font-semibold text-black">Change password</h2>
        <p className="mt-2 text-sm text-neutral-500">
          Uses your current signed-in session to authorize the update.
        </p>
        <form action={changePassword} className="mt-4 space-y-4">
          <input type="hidden" name="auid" value={auid} />
          <Input
            name="newPassword"
            label="New password"
            type="password"
            required
          />
          <Input
            name="confirmPassword"
            label="Confirm password"
            type="password"
            required
          />
          {passwordState.error ? (
            <FormError>{passwordState.error}</FormError>
          ) : null}
          {passwordState.success ? (
            <FormSuccess>{passwordState.success}</FormSuccess>
          ) : null}
          <Button type="submit" variant="brand" className="w-full" disabled={changingPassword}>
            {changingPassword ? "Updating..." : "Update password"}
          </Button>
        </form>
      </section>
    </div>
  );
}
