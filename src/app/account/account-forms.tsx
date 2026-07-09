"use client";

import { useRouter } from "next/navigation";
import {
  useActionState,
  useEffect,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { changePasswordAction, type AuthActionState } from "@/app/actions/auth";
import {
  InlineEditActions,
  PanelHeader,
  StatusBadge,
} from "@/app/account/dashboard-ui";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormError, FormSuccess } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";

type AccountFormsProps = {
  auid: string;
  onEditingChange?: (editing: boolean) => void;
  cancelRef?: RefObject<(() => void) | null>;
};

const initialState: AuthActionState = {};

function handleFormKeyDown(
  event: KeyboardEvent<HTMLFormElement>,
  onCancel: () => void,
) {
  if (event.key === "Escape") {
    event.preventDefault();
    onCancel();
  }
}

export function AccountForms({ auid, onEditingChange, cancelRef }: AccountFormsProps) {
  const router = useRouter();
  const [passwordState, changePassword, changingPassword] = useActionState(
    changePasswordAction,
    initialState,
  );
  const [isEditing, setIsEditing] = useState(false);

  const cancelEditing = () => {
    setIsEditing(false);
  };

  useEffect(() => {
    onEditingChange?.(isEditing);
  }, [isEditing, onEditingChange]);

  useEffect(() => {
    if (cancelRef) {
      cancelRef.current = cancelEditing;
    }
  });

  useEffect(() => {
    if (passwordState.success) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsEditing(false);
      router.refresh();
    }
  }, [passwordState.success, router]);

  if (!isEditing) {
    return (
      <Card className="p-6 sm:p-8">
        <PanelHeader
          title="Security"
          subtitle="Password and account protection"
          action={
            <Button
              type="button"
              variant="ghost"
              className="h-8 px-3"
              onClick={() => setIsEditing(true)}
            >
              Change password
            </Button>
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
      </Card>
    );
  }

  const formId = `change-password-${auid}`;

  return (
    <Card className="p-6 sm:p-8">
      <PanelHeader
        title="Security"
        subtitle="Choose a new password"
        action={
          <InlineEditActions
            formId={formId}
            onCancel={cancelEditing}
            isSubmitting={changingPassword}
          />
        }
      />

      <form
        id={formId}
        action={changePassword}
        className="mt-6 space-y-4"
        onKeyDown={(event) => handleFormKeyDown(event, cancelEditing)}
      >
        <input type="hidden" name="auid" value={auid} />

        <Input name="newPassword" label="New password" type="password" required autoFocus />
        <Input name="confirmPassword" label="Confirm password" type="password" required />

        {passwordState.error ? <FormError>{passwordState.error}</FormError> : null}
        {passwordState.success ? <FormSuccess>{passwordState.success}</FormSuccess> : null}

        <Button
          type="submit"
          variant="brand"
          className="w-full"
          disabled={changingPassword}
        >
          {changingPassword ? "Saving..." : "Save password"}
        </Button>
      </form>
    </Card>
  );
}
