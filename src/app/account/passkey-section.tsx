"use client";

import { useState, useTransition } from "react";
import {
  Fingerprint,
  KeyRound,
  Plus,
  Trash2,
  Loader2,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { SubsectionTitle, StatusBadge } from "@/app/account/dashboard-ui";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormError, FormSuccess } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { createPasskeyCredential } from "@/lib/webauthn";
import {
  startPasskeyEnrollmentAction,
  verifyPasskeyEnrollmentAction,
  updatePasskeyNameAction,
  deletePasskeyAction,
} from "@/app/actions/passkey";
import type { PasskeyCredential } from "@/lib/passkey-graphql";
import { roundedRect } from "@/lib/design";
import { cn } from "@/lib/utils";

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

  const handleAddPasskey = async () => {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        const nameToUse = passkeyName.trim() || "My Passkey";

        // 1. Get enrollment challenge from backend
        const result = await startPasskeyEnrollmentAction(nameToUse);
        if (result.error || !result.enrollmentResponse || !result.passkeyUsername) {
          setError(result.error || "Failed to initiate passkey enrollment.");
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
          setSuccess(verifyResult.success || "Passkey registered successfully!");
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
            setError("Passkey registration was canceled or timed out.");
          } else if (err.name === "SecurityError") {
            setError("Passkey registration is not allowed on this domain.");
          } else if (err.name === "NotSupportedError") {
            setError("Passkeys are not supported on this device or browser.");
          } else {
            setError(err.message || "An error occurred while registering passkey.");
          }
        } else {
          setError("An error occurred while registering passkey.");
        }
      }
    });
  };

  const handleStartRename = (passkey: PasskeyCredential) => {
    setError(null);
    setSuccess(null);
    setEditingId(passkey.id);
    setEditingName(passkey.name || "My Passkey");
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
    <Card className="mt-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/[0.06] bg-white shadow-sm">
            <Fingerprint className="h-5 w-5 text-neutral-700" />
          </span>
          <SubsectionTitle
            title="Passkeys"
            description="Use Touch ID, Face ID, security keys, or Windows Hello to sign in seamlessly without passwords."
          />
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {passkeys.length > 0 ? (
            <span className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full bg-emerald-50 px-3 text-xs font-medium text-emerald-700 leading-none">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
              {passkeys.length} {passkeys.length === 1 ? "passkey" : "passkeys"} active
            </span>
          ) : (
            <span className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full bg-neutral-100 px-3 text-xs font-medium text-neutral-600 leading-none">
              Not configured
            </span>
          )}

          {!isAdding && (
            <button
              type="button"
              className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full bg-black/[0.04] px-3 text-xs font-medium text-neutral-700 transition-colors hover:bg-black/[0.07] hover:text-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/10 leading-none"
              onClick={() => {
                setError(null);
                setSuccess(null);
                setIsAdding(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              {passkeys.length > 0 ? "Add another" : "Add passkey"}
            </button>
          )}
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

      {isAdding && (
        <div
          className={cn(
            "mt-5 border border-black/10 bg-neutral-50/70 p-4.5 space-y-4 transition-all",
            roundedRect,
          )}
        >
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold text-neutral-900">Name your passkey</h4>
            <p className="text-[11px] text-neutral-500">
              Give this passkey a name to help identify which device or key it belongs to.
            </p>
          </div>

          <Input
            name="passkeyName"
            label="Passkey Name"
            placeholder="e.g. MacBook Touch ID, YubiKey 5C, iCloud Keychain"
            value={passkeyName}
            onChange={(e) => setPasskeyName(e.target.value)}
            disabled={isPending}
            autoFocus
          />

          <div className="flex gap-2">
            <Button
              type="button"
              variant="brand"
              onClick={handleAddPasskey}
              disabled={isPending}
              className="gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating passkey…
                </>
              ) : (
                <>
                  <Fingerprint className="h-4 w-4" />
                  Register passkey
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsAdding(false);
                setPasskeyName("");
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="mt-5 space-y-3">
        {passkeys.length === 0 ? (
          <div className="flex items-center justify-between py-3 px-4 border border-dashed border-black/10 rounded-xl text-xs text-neutral-500 bg-neutral-50/30">
            <div className="flex items-center gap-2.5">
              <Fingerprint className="h-4 w-4 text-neutral-400" />
              <span>No passkeys enrolled yet. Add one for fast, passwordless sign in.</span>
            </div>
          </div>
        ) : (
          passkeys.map((passkey) => (
            <div
              key={passkey.id}
              className={cn(
                "flex items-center justify-between p-3.5 border border-black/5 bg-white/70 backdrop-blur-xs text-xs transition-all hover:border-black/10",
                roundedRect,
              )}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-black">
                  <KeyRound className="h-4.5 w-4.5 text-neutral-700" />
                </div>
                <div className="min-w-0 flex-1">
                  {editingId === passkey.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="h-8 rounded-md border border-black/20 bg-white px-2.5 text-xs text-black focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                        autoFocus
                        disabled={isPending}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleSaveRename(passkey.id);
                          } else if (e.key === "Escape") {
                            setEditingId(null);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveRename(passkey.id)}
                        disabled={isPending}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-black text-white hover:bg-neutral-800 disabled:opacity-50"
                        title="Save name"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        disabled={isPending}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-black/10 bg-white text-neutral-600 hover:bg-neutral-100 disabled:opacity-50"
                        title="Cancel"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group">
                      <p className="font-semibold text-black truncate">
                        {passkey.name || "Passkey"}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleStartRename(passkey)}
                        disabled={isPending}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-neutral-400 hover:text-black focus:opacity-100"
                        title="Rename passkey"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  <p className="text-[11px] text-neutral-500">
                    Added {new Date(passkey.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                className="h-8 px-2.5 text-red-600 hover:text-red-700 hover:bg-red-50 gap-1.5 font-medium shrink-0"
                onClick={() => handleDeletePasskey(passkey.id)}
                disabled={isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </Button>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
