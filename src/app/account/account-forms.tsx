"use client";

import { useActionState, useEffect, useState } from "react";
import { changePasswordAction, type AuthActionState } from "@/app/actions/auth";
import {
  glassSurfaceStrong,
  InlineEditActions,
  PanelHeader,
  StatusBadge,
  TextAction,
} from "@/app/account/dashboard-ui";
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const formId = `change-password-${auid}`;

  return (
    <section className={`${glassSurfaceStrong} p-6 sm:p-7`}>
      <PanelHeader
        title="Security"
        subtitle="Choose a new password"
        action={
          <InlineEditActions
            formId={formId}
            onCancel={() => setIsEditing(false)}
            isSubmitting={changingPassword}
          />
        }
      />

      <form id={formId} action={changePassword} className="mt-6 space-y-4">
        <input type="hidden" name="auid" value={auid} />

        <Input name="newPassword" label="New password" type="password" required autoFocus />
        <Input name="confirmPassword" label="Confirm password" type="password" required />

        {passwordState.error ? <FormError>{passwordState.error}</FormError> : null}
        {passwordState.success ? <FormSuccess>{passwordState.success}</FormSuccess> : null}
      </form>
    </section>
  );
}
