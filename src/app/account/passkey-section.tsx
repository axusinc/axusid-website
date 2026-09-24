"use client";

import { useState, useTransition } from "react";
import { Fingerprint, KeyRound, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { FormError, FormSuccess } from "@/components/ui/form-message";
import { Input, inputClassName } from "@/components/ui/input";
import { createPasskeyCredential } from "@/lib/webauthn";
import {
  startPasskeyEnrollmentAction,
  verifyPasskeyEnrollmentAction,
  updatePasskeyNameAction,
  deletePasskeyAction,
} from "@/app/actions/passkey";
import type { PasskeyCredential } from "@/lib/passkey-graphql";
import {
  DEFAULT_PASSKEY_NAME,
  ensureUniquePasskeyName,
  getSuggestedPasskeyNameFromNavigator,
} from "@/lib/passkey-naming";
import { cn, formatDate } from "@/lib/utils";

type PasskeySectionProps = {
  initialPasskeys?: PasskeyCredential[];
};

export function PasskeySection({ initialPasskeys = [] }: PasskeySectionProps) {
  const [passkeys, setPasskeys] = useState<PasskeyCredential[]>(initialPasskeys);
  const [isAdding, setIsAdding] = useState(false);
  const [passkeyName, setPasskeyName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const getPrefilledName = () =>
    ensureUniquePasskeyName(
      getSuggestedPasskeyNameFromNavigator(),
      passkeys.map((p) => p.name),
    );

  const handleStartAdding = () => {
    setError(null);
    setSuccess(null);
    setPasskeyName(getPrefilledName());
    setIsAdding(true);
  };

  const handleAddPasskey = async () => {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        const nameToUse = passkeyName.trim() || getPrefilledName();

        const rp = typeof window !== "undefined" ? window.location.hostname : undefined;
        // 1. Get enrollment challenge from backend
        const result = await startPasskeyEnrollmentAction(nameToUse, rp);
        if (result.error || !result.enrollmentResponse || !result.passkeyUsername) {
          setError(result.error || "We couldn’t start adding a passkey. Try again.");
          return;
        }

        // 2. Call browser WebAuthn API
        const credential = await createPasskeyCredential(
          result.enrollmentResponse.optionsJson,
          {
            name: result.passkeyUsername,
            displayName: result.passkeyUsername,
          },
        );

        // 3. Send back credential response to backend with custom passkey name
        const verifyResult = await verifyPasskeyEnrollmentAction(
          result.enrollmentResponse.challengeId,
          JSON.stringify(credential),
          nameToUse,
        );

        if (verifyResult.error) {
          setError(verifyResult.error);
        } else {
          setSuccess(verifyResult.success || "Passkey added. You can now use it to sign in.");
          const newPasskey: PasskeyCredential = {
            id: credential.id,
            credentialId: credential.id,
            name: nameToUse,
            createdAt: new Date().toISOString(),
          };
          setPasskeys((prev) => [newPasskey, ...prev]);
          setIsAdding(false);
          setPasskeyName("");
        }
      } catch (err) {
        if (err instanceof Error) {
          if (err.name === "InvalidStateError" || err.message.includes("already registered")) {
            setError("This passkey or security key is already registered on your account.");
          } else if (err.name === "NotAllowedError") {
            setError("Adding the passkey was cancelled or timed out.");
          } else if (err.name === "SecurityError") {
            setError("Passkeys can’t be added on this domain.");
          } else if (err.name === "NotSupportedError") {
            setError("This device or browser doesn’t support passkeys.");
          } else {
            setError(err.message || "Something went wrong while adding the passkey.");
          }
        } else {
          setError("Something went wrong while adding the passkey.");
        }
      }
    });
  };

  const handleStartRename = (passkey: PasskeyCredential) => {
    setError(null);
    setSuccess(null);
    setEditingId(passkey.id);
    setEditingName(passkey.name || DEFAULT_PASSKEY_NAME);
  };

  const handleSaveRename = (passkeyId: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      setError("Passkey name cannot be empty.");
      return;
    }

    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const res = await updatePasskeyNameAction(passkeyId, trimmed);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(res.success || "Passkey name updated.");
        setPasskeys((prev) =>
          prev.map((p) => (p.id === passkeyId ? { ...p, name: trimmed } : p)),
        );
        setEditingId(null);
      }
    });
  };

  const handleDeletePasskey = (id: string) => {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const res = await deletePasskeyAction(id);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(res.success || "Passkey removed.");
        setPasskeys((prev) => prev.filter((p) => p.id !== id));
      }
    });
  };

  return (
    <Card>
      <CardHeader
        icon={<Fingerprint aria-hidden />}
        title="Passkeys"
        description="Sign in with Face ID, Touch ID, Windows Hello or a security key. Faster than a password and resistant to phishing."
        badge={
          passkeys.length > 0 ? (
            <Badge tone="success" dot>
              {passkeys.length} active
            </Badge>
          ) : (
            <Badge tone="warning">Recommended</Badge>
          )
        }
        action={
          isAdding ? null : (
            <Button
              type="button"
              variant={passkeys.length > 0 ? "secondary" : "primary"}
              size="sm"
              onClick={handleStartAdding}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Add passkey
            </Button>
          )
        }
      />

      {error ? <FormError className="mt-5">{error}</FormError> : null}
      {success ? <FormSuccess className="mt-5">{success}</FormSuccess> : null}

      {isAdding ? (
        <form
          className="mt-5 space-y-4 border-t border-black/[0.05] pt-5"
          onSubmit={(event) => {
            event.preventDefault();
            handleAddPasskey();
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape" && !isPending) {
              setIsAdding(false);
              setPasskeyName("");
            }
          }}
        >
          <Input
            id="passkey-name"
            name="passkeyName"
            label="Passkey name"
            hint="Prefilled from this device — edit it if you like."
            placeholder="My passkey"
            value={passkeyName}
            onChange={(e) => setPasskeyName(e.target.value)}
            disabled={isPending}
            maxLength={64}
            autoFocus
          />

          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="md" loading={isPending}>
              {isPending ? "Waiting for your device…" : "Continue"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => {
                setIsAdding(false);
                setPasskeyName("");
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {passkeys.length > 0 ? (
        <ul className="mt-5 divide-y divide-black/[0.05] rounded-xl border border-black/[0.07]">
          {passkeys.map((passkey) => (
            <li key={passkey.id} className="flex flex-wrap items-center gap-3 px-3.5 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600">
                <KeyRound aria-hidden className="h-4 w-4" />
              </span>

              {editingId === passkey.id ? (
                <form
                  className="flex min-w-0 flex-1 items-center gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleSaveRename(passkey.id);
                  }}
                >
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className={cn(inputClassName, "h-9 min-w-0 flex-1")}
                    aria-label="Passkey name"
                    maxLength={64}
                    autoFocus
                    disabled={isPending}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setEditingId(null);
                      }
                    }}
                  />
                  <Button type="submit" size="sm" loading={isPending}>
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingId(null)}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                </form>
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-950">
                      {passkey.name || "Passkey"}
                    </p>
                    <p className="text-[13px] text-neutral-500">Added {formatDate(passkey.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStartRename(passkey)}
                      disabled={isPending}
                    >
                      <Pencil aria-hidden className="h-3.5 w-3.5" />
                      Rename
                    </Button>
                    <ConfirmButton
                      confirmLabel="Remove"
                      onConfirm={() => handleDeletePasskey(passkey.id)}
                      disabled={isPending}
                    >
                      <Trash2 aria-hidden className="h-3.5 w-3.5" />
                      Remove
                    </ConfirmButton>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : !isAdding ? (
        <p className="mt-5 rounded-xl border border-dashed border-black/[0.1] px-4 py-3.5 text-sm text-neutral-500">
          You haven’t added a passkey yet.
        </p>
      ) : null}
    </Card>
  );
}
