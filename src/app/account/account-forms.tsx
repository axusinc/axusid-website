"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, Loader2, Pencil, Plus } from "lucide-react";
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
import { SubsectionTitle } from "@/app/account/dashboard-ui";
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
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 ring-1 ring-black/10">
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
        <div className="flex min-w-0 flex-1 items-start gap-3.5">
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

        <div className="flex shrink-0 items-center gap-1.5">
          {isConnected ? (
            <span className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full bg-emerald-50 px-3 text-xs font-medium text-emerald-700 leading-none">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
              Connected
            </span>
          ) : (
            <span className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full bg-neutral-100 px-3 text-xs font-medium text-neutral-600 leading-none">
              Not connected
            </span>
          )}

          <a
            href="/auth/google?mode=link"
            className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full bg-black/[0.04] px-3 text-xs font-medium text-neutral-700 transition-colors hover:bg-black/[0.07] hover:text-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/10 leading-none"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            {isConnected ? "Connect another" : "Connect Google"}
          </a>
        </div>
      </div>


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
                <GoogleAccountAvatar
                  picture={account.userInfo?.picture}
                  name={account.userInfo?.name}
                  email={account.userInfo?.email}
                />
                <div>
                  <p className="font-semibold text-black">
                    {account.userInfo?.name || account.userInfo?.email || "Google Account"}
                  </p>
                  {account.userInfo?.name && account.userInfo?.email ? (
                    <p className="text-[11px] font-medium text-neutral-600">
                      {account.userInfo.email}
                    </p>
                  ) : null}
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

  const formId = `change-password-${auid}`;

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/[0.06] bg-white shadow-sm">
              <KeyRound className="h-5 w-5 text-neutral-700" />
            </span>
            <SubsectionTitle
              title="Password"
              description="Sign in to AXUS ID with your password."
            />
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <span className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full bg-emerald-50 px-3 text-xs font-medium text-emerald-700 leading-none">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
              Password active
            </span>

            {!isEditing && (
              <button
                type="button"
                className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full bg-black/[0.04] px-3 text-xs font-medium text-neutral-700 transition-colors hover:bg-black/[0.07] hover:text-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/10 leading-none"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="h-3.5 w-3.5 text-neutral-600" strokeWidth={2} aria-hidden />
                Change password
              </button>
            )}
          </div>
        </div>

        {passwordState.success && !isEditing ? (
          <div className="mt-5">
            <FormSuccess>{passwordState.success}</FormSuccess>
          </div>
        ) : null}

        {isEditing && (
          <form
            id={formId}
            action={changePassword}
            className={cn(
              "mt-5 border border-black/10 bg-neutral-50/70 p-4.5 space-y-4 transition-all",
              roundedRect,
            )}
            onKeyDown={(event) => handleFormKeyDown(event, cancelEditing)}
          >
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-neutral-900">Change password</h4>
              <p className="text-[11px] text-neutral-500">
                Enter a new password. You will use it the next time you sign in.
              </p>
            </div>

            <input type="hidden" name="auid" value={auid} />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input name="newPassword" label="New password" type="password" required autoFocus />
              <Input name="confirmPassword" label="Confirm new password" type="password" required />
            </div>

            {passwordState.error ? <FormError>{passwordState.error}</FormError> : null}
            {passwordState.success ? <FormSuccess>{passwordState.success}</FormSuccess> : null}

            <div className="flex gap-2">
              <Button
                type="submit"
                variant="brand"
                disabled={changingPassword}
                className="gap-2"
              >
                {changingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving password…
                  </>
                ) : (
                  <>
                    <KeyRound className="h-4 w-4" />
                    Save password
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={cancelEditing}
                disabled={changingPassword}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Card>

      <PasskeySection initialPasskeys={initialPasskeys} />
      <GoogleConnectionCard initialExternalIdentities={initialExternalIdentities} />
    </div>
  );
}
