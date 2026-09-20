"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, Plus } from "lucide-react";
import {
  useActionState,
  useEffect,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { useTransition } from "react";
import { changePasswordAction, type AuthActionState } from "@/app/actions/auth";
import { unlinkExternalIdentityAction } from "@/app/actions/external-identity";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Alert, FormError, FormSuccess } from "@/components/ui/form-message";
import { PasswordInput } from "@/components/ui/password-input";

import { PasskeySection } from "./passkey-section";
import type { PasskeyCredential } from "@/lib/passkey-graphql";
import type { ExternalIdentity } from "@/lib/google-oauth";
import { formatDate } from "@/lib/utils";

type AccountFormsProps = {
  auid: string;
  initialPasskeys?: PasskeyCredential[];
  initialExternalIdentities?: ExternalIdentity[];
  initialHasPassword: boolean;
  onEditingChange?: (editing: boolean) => void;
  cancelRef?: RefObject<(() => void) | null>;
};

const initialState: AuthActionState = {};

function GoogleAccountAvatar({
  picture,
  name,
  email,
}: {
  picture?: string;
  name?: string;
  email?: string;
}) {
  const [imgError, setImgError] = useState(false);

  if (picture && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={picture}
        alt={name || email || "Google Avatar"}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-black/10"
      />
    );
  }

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-black/10">
      <Image
        src="/google-g.svg"
        width={18}
        height={18}
        alt=""
        aria-hidden
        className="h-4.5 w-4.5"
      />
    </div>
  );
}

function GoogleConnectionCard({
  initialExternalIdentities = [],
}: {
  initialExternalIdentities?: ExternalIdentity[];
}) {
  const searchParams = useSearchParams();
  const googleStatus = searchParams.get("google");

  const [externalIdentities, setExternalIdentities] = useState<ExternalIdentity[]>(
    initialExternalIdentities,
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const googleAccounts = externalIdentities.filter(
    (item) => item.providerId.toLowerCase() === "google",
  );
  const isConnected = googleAccounts.length > 0;

  const handleUnlink = (id: string) => {
    setError(null);
    setSuccess(null);
    setPendingId(id);
    startTransition(async () => {
      const res = await unlinkExternalIdentityAction(id);
      setPendingId(null);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(res.success || "Google account disconnected.");
        setExternalIdentities((prev) => prev.filter((item) => item.id !== id));
      }
    });
  };

  const statusMessage =
    googleStatus === "linked"
      ? { tone: "success" as const, text: "Google is now connected. You can use it to sign in." }
      : googleStatus === "already_linked"
        ? { tone: "error" as const, text: "That Google account is already connected to a different AXUS ID." }
        : googleStatus === "cancelled"
          ? { tone: "error" as const, text: "Connecting Google was cancelled." }
          : googleStatus === "failed"
            ? { tone: "error" as const, text: "We couldn’t connect Google. Try again." }
            : null;

  return (
    <Card>
      <CardHeader
        icon={<Image src="/google-g.svg" width={18} height={18} alt="" aria-hidden />}
        title="Google"
        description="Sign in with your Google account instead of typing a password."
        badge={
          isConnected ? (
            <Badge tone="success" dot>
              Connected
            </Badge>
          ) : (
            <Badge>Not connected</Badge>
          )
        }
        action={
          <a href="/auth/google?mode=link" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            {isConnected ? "Connect another" : "Connect"}
          </a>
        }
      />

      {error ? <FormError className="mt-5">{error}</FormError> : null}
      {success ? <FormSuccess className="mt-5">{success}</FormSuccess> : null}
      {statusMessage ? (
        <Alert tone={statusMessage.tone} className="mt-5">
          {statusMessage.text}
        </Alert>
      ) : null}

      {isConnected ? (
        <ul className="mt-5 divide-y divide-black/[0.05] rounded-xl border border-black/[0.07]">
          {googleAccounts.map((account) => (
            <li key={account.id} className="flex flex-wrap items-center gap-3 px-3.5 py-3">
              <GoogleAccountAvatar
                picture={account.userInfo?.picture}
                name={account.userInfo?.name}
                email={account.userInfo?.email}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-neutral-950">
                  {account.userInfo?.email || account.userInfo?.name || "Google account"}
                </p>
                <p className="text-[13px] text-neutral-500">
                  Connected {formatDate(account.createdAt)}
                </p>
              </div>
              <ConfirmButton
                confirmLabel="Disconnect"
                onConfirm={() => handleUnlink(account.id)}
                loading={pendingId === account.id}
                disabled={isPending}
              >
                Disconnect
              </ConfirmButton>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

function handleFormKeyDown(
  event: KeyboardEvent<HTMLFormElement>,
  onCancel: () => void,
) {
  if (event.key === "Escape") {
    event.preventDefault();
    onCancel();
  }
}

export function AccountForms({
  auid,
  initialPasskeys = [],
  initialExternalIdentities = [],
  initialHasPassword,
  onEditingChange,
  cancelRef,
}: AccountFormsProps) {
  const router = useRouter();
  const [passwordState, changePassword, changingPassword] = useActionState(
    changePasswordAction,
    initialState,
  );
  const [isEditing, setIsEditing] = useState(false);
  const [hasPassword, setHasPassword] = useState(initialHasPassword);
  const [showPasswords, setShowPasswords] = useState(false);

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
      setHasPassword(true);
      router.refresh();
    }
  }, [passwordState.success, router]);

  const formId = `change-password-${auid}`;

  return (
    <div className="space-y-5">
      <PasskeySection initialPasskeys={initialPasskeys} />

      <Card>
        <CardHeader
          icon={<KeyRound aria-hidden />}
          title="Password"
          description={
            hasPassword
              ? "Use your username and password to sign in."
              : "Add a password as a backup way to sign in."
          }
          badge={
            hasPassword ? (
              <Badge tone="success" dot>
                Set
              </Badge>
            ) : (
              <Badge>Not set</Badge>
            )
          }
          action={
            isEditing ? null : (
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
                {hasPassword ? "Change" : "Set password"}
              </Button>
            )
          }
        />

        {passwordState.success && !isEditing ? (
          <FormSuccess className="mt-5">{passwordState.success}</FormSuccess>
        ) : null}

        {isEditing ? (
          <form
            id={formId}
            action={changePassword}
            className="mt-5 space-y-4 border-t border-black/[0.05] pt-5"
            onKeyDown={(event) => handleFormKeyDown(event, cancelEditing)}
          >
            <input type="hidden" name="auid" value={auid} />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <PasswordInput
                id={`${formId}-new`}
                name="newPassword"
                label="New password"
                autoComplete="new-password"
                visible={showPasswords}
                onVisibleChange={setShowPasswords}
                required
                autoFocus
              />
              <PasswordInput
                id={`${formId}-confirm`}
                name="confirmPassword"
                label="Confirm new password"
                autoComplete="new-password"
                visible={showPasswords}
                onVisibleChange={setShowPasswords}
                required
              />
            </div>

            {passwordState.error ? <FormError>{passwordState.error}</FormError> : null}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="md" loading={changingPassword}>
                {changingPassword ? "Saving…" : "Save password"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={cancelEditing}
                disabled={changingPassword}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : null}
      </Card>

      <GoogleConnectionCard initialExternalIdentities={initialExternalIdentities} />
    </div>
  );
}
