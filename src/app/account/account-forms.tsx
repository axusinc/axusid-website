"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
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
import {
  InlineEditActions,
  StatusBadge,
  SubsectionTitle,
} from "@/app/account/dashboard-ui";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormError, FormSuccess } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";

import { PasskeySection } from "./passkey-section";
import type { PasskeyCredential } from "@/lib/passkey-graphql";
import type { ExternalIdentity } from "@/lib/google-oauth";
import { roundedRect } from "@/lib/design";
import { cn } from "@/lib/utils";

type AccountFormsProps = {
  auid: string;
  initialPasskeys?: PasskeyCredential[];
  initialExternalIdentities?: ExternalIdentity[];
  onEditingChange?: (editing: boolean) => void;
  cancelRef?: RefObject<(() => void) | null>;
};

const initialState: AuthActionState = {};

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

  const googleAccounts = externalIdentities.filter(
    (item) => item.providerId.toLowerCase() === "google",
  );
  const isConnected = googleAccounts.length > 0;

  const handleUnlink = (id: string) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await unlinkExternalIdentityAction(id);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(res.success || "Google account disconnected.");
        setExternalIdentities((prev) => prev.filter((item) => item.id !== id));
      }
    });
  };

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/[0.06] bg-white shadow-sm">
            <Image
              src="/google-g.svg"
              width={20}
              height={20}
              alt=""
              aria-hidden
              className="h-5 w-5"
            />
          </span>
          <SubsectionTitle
            title="Google"
            description="Connect a Google account so you can use it to sign in to this AXUS ID."
          />
        </div>

        <div className="flex items-center gap-2">
          {isConnected ? (
            <StatusBadge className="bg-emerald-50 text-emerald-700 border-emerald-200/60">
              Connected
            </StatusBadge>
          ) : (
            <StatusBadge className="bg-neutral-100 text-neutral-600">
              Not connected
            </StatusBadge>
          )}

          <a
            href="/auth/google?mode=link"
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-[12px] border border-black/10 bg-white/60 px-4 text-sm font-medium text-black transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/10"
          >
            {isConnected ? "Connect another" : "Connect Google"}
          </a>
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-neutral-500">
        Choose the Google account you want to use. A Google account can only be connected to one AXUS ID.
      </p>

      {error ? (
        <div className="mt-4">
          <FormError>{error}</FormError>
        </div>
      ) : null}

      {success ? (
        <div className="mt-4">
          <FormSuccess>{success}</FormSuccess>
        </div>
      ) : null}

      {googleStatus === "linked" ? (
        <div className="mt-5">
          <FormSuccess>Google sign-in is now connected to your AXUS ID.</FormSuccess>
        </div>
      ) : googleStatus === "already_linked" ? (
        <div className="mt-5">
          <FormError>
            That Google account is already connected to a different AXUS ID.
          </FormError>
        </div>
      ) : googleStatus === "cancelled" ? (
        <div className="mt-5">
          <FormError>Google connection was cancelled.</FormError>
        </div>
      ) : googleStatus === "failed" ? (
        <div className="mt-5">
          <FormError>We couldn’t connect Google. Please try again.</FormError>
        </div>
      ) : null}

      {isConnected && (
        <div className="mt-5 space-y-3">
          {googleAccounts.map((account) => (
            <div
              key={account.id}
              className={cn(
                "flex items-center justify-between p-3.5 border border-black/5 bg-white/70 backdrop-blur-xs text-xs",
                roundedRect,
              )}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5">
                  <Image
                    src="/google-g.svg"
                    width={16}
                    height={16}
                    alt=""
                    aria-hidden
                    className="h-4 w-4"
                  />
                </div>
                <div>
                  <p className="font-semibold text-black">Google Account</p>
                  <p className="text-[11px] text-neutral-500">
                    Connected on {new Date(account.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => handleUnlink(account.id)}
                disabled={isPending}
              >
                {isPending ? "Disconnecting..." : "Disconnect"}
              </Button>
            </div>
          ))}
        </div>
      )}
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
  onEditingChange,
  cancelRef,
}: AccountFormsProps) {
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
      <div className="space-y-6">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <SubsectionTitle
              title="Password"
              description="Sign in to AXUS ID with your password."
            />
            <Button
              type="button"
              variant="outline"
              className="h-9 shrink-0"
              onClick={() => setIsEditing(true)}
            >
              Change password
            </Button>
          </div>

          <div className="mt-4">
            <StatusBadge>Password active</StatusBadge>
          </div>

          {passwordState.success ? (
            <div className="mt-5">
              <FormSuccess>{passwordState.success}</FormSuccess>
            </div>
          ) : null}
        </Card>

        <PasskeySection initialPasskeys={initialPasskeys} />
        <GoogleConnectionCard initialExternalIdentities={initialExternalIdentities} />
      </div>
    );
  }

  const formId = `change-password-${auid}`;

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <SubsectionTitle
            title="Change password"
            description="Enter a new password. You will use it the next time you sign in."
          />
          <InlineEditActions
            formId={formId}
            onCancel={cancelEditing}
            isSubmitting={changingPassword}
          />
        </div>

        <form
          id={formId}
          action={changePassword}
          className="mt-6 space-y-4"
          onKeyDown={(event) => handleFormKeyDown(event, cancelEditing)}
        >
          <input type="hidden" name="auid" value={auid} />

          <Input name="newPassword" label="New password" type="password" required autoFocus />
          <Input name="confirmPassword" label="Confirm new password" type="password" required />

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

      <PasskeySection initialPasskeys={initialPasskeys} />
      <GoogleConnectionCard initialExternalIdentities={initialExternalIdentities} />
    </div>
  );
}
