"use client";

import { useActionState, useEffect, useState } from "react";
import { changePasswordAction, type AuthActionState } from "@/app/actions/auth";
import {
  glassSurfaceStrong,
  PanelHeader,
  StatusBadge,
  TextAction,
} from "@/app/account/dashboard-ui";
import { Button } from "@/components/ui/button";
import { FormError, FormSuccess } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";

type AccountFormsProps = {
  auid: string;
};

const initialState: AuthActionState = {};

export function AccountForms({ auid }: AccountFormsProps) {
  const [passwordState, changePassword, changingPassword] = useActionState(
    changePasswordAction,
    initialState,
  );
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (passwordState.success) {
      setIsEditing(false);
    }
  }, [passwordState.success]);

  if (!isEditing) {
    return (
      <section className={`${glassSurfaceStrong} p-6 sm:p-7`}>
        <PanelHeader
          title="Security"
          subtitle="Password and account protection"
          action={
            <TextAction onClick={() => setIsEditing(true)}>Change password</TextAction>
          }
        />

        <div className="mt-6">
          <StatusBadge>Password is set</StatusBadge>
        </div>

        {passwordState.success ? (
          <div className="mt-5">
            <FormSuccess>{passwordState.success}</FormSuccess>
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section className={`${glassSurfaceStrong} p-6 sm:p-7`}>
      <PanelHeader title="New password" subtitle="Choose a strong password" />

      <form action={changePassword} className="mt-6 space-y-5">
        <input type="hidden" name="auid" value={auid} />

        <div className="space-y-4">
          <Input name="newPassword" label="New password" type="password" required />
          <Input
            name="confirmPassword"
            label="Confirm password"
            type="password"
            required
          />
        </div>

        {passwordState.error ? <FormError>{passwordState.error}</FormError> : null}
        {passwordState.success ? <FormSuccess>{passwordState.success}</FormSuccess> : null}

        <div className="flex gap-3 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsEditing(false)}
            className="flex-1"
            disabled={changingPassword}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="brand"
            className="flex-1"
            disabled={changingPassword}
          >
            {changingPassword ? "Updating..." : "Update"}
          </Button>
        </div>
      </form>
    </section>
  );
}
