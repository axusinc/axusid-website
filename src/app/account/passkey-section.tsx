"use client";

import { useState, useTransition } from "react";
import { SubsectionTitle, StatusBadge } from "@/app/account/dashboard-ui";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormError, FormSuccess } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { createPasskeyCredential } from "@/lib/webauthn";
import {
  startPasskeyEnrollmentAction,
  verifyPasskeyEnrollmentAction,
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleAddPasskey = async () => {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        // 1. Get enrollment challenge from backend
        const result = await startPasskeyEnrollmentAction(
          passkeyName.trim() || "My Passkey",
        );
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

        // 3. Send back credential response to backend
        const verifyResult = await verifyPasskeyEnrollmentAction(
          result.enrollmentResponse.challengeId,
          JSON.stringify(credential),
        );

        if (verifyResult.error) {
          setError(verifyResult.error);
        } else {
          setSuccess(verifyResult.success || "Passkey added successfully!");
          const newPasskey: PasskeyCredential = {
            id: credential.id,
            name: passkeyName.trim() || "My Passkey",
            createdAt: new Date().toISOString(),
          };
          setPasskeys((prev) => [newPasskey, ...prev]);
          setIsAdding(false);
          setPasskeyName("");
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An error occurred while creating passkey.",
        );
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
        <SubsectionTitle
          title="Passkeys"
          description="Use Touch ID, Face ID, or Windows Hello to sign in without typing passwords."
        />
        {!isAdding && (
          <Button
            type="button"
            variant="outline"
            className="h-9 shrink-0"
            onClick={() => setIsAdding(true)}
          >
            Add a passkey
          </Button>
        )}
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
            "mt-5 border border-black/10 bg-neutral-50/50 p-4 space-y-4",
            roundedRect,
          )}
        >
          <Input
            name="passkeyName"
            label="Passkey Name"
            placeholder="e.g. MacBook Pro Touch ID, YubiKey"
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
            >
              {isPending ? "Creating passkey..." : "Register passkey"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAdding(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="mt-5 space-y-3">
        {passkeys.length === 0 ? (
          <div className="flex items-center justify-between py-2 text-xs text-neutral-500">
            <span>No passkeys enrolled yet.</span>
            <StatusBadge className="bg-neutral-100 text-neutral-600">
              Not configured
            </StatusBadge>
          </div>
        ) : (
          passkeys.map((passkey) => (
            <div
              key={passkey.id}
              className={cn(
                "flex items-center justify-between p-3.5 border border-black/5 bg-white/70 backdrop-blur-xs text-xs",
                roundedRect,
              )}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-black">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 0121 9z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-black">
                    {passkey.name || "Passkey"}
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    Added {new Date(passkey.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => handleDeletePasskey(passkey.id)}
                disabled={isPending}
              >
                Remove
              </Button>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
