"use client";

import { useActionState, useEffect, useState } from "react";
import {
  createVariationAction,
  updateVariationAction,
  type VariationActionState,
} from "@/app/account/variation-actions";
import {
  CopyChip,
  DataBlock,
  DataRow,
  fieldLabelClassName,
  glassSurfaceStrong,
  PanelHeader,
  TextAction,
  textareaClassName,
} from "@/app/account/dashboard-ui";
import { Button } from "@/components/ui/button";
import { FormError, FormSuccess } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";

type Variation = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  status: string | null;
  description: string | null;
};

type ProfileFormProps = {
  defaultVariation: Variation | null;
  defaultUsername: string | null;
  auid: string;
};

const initialState: VariationActionState = {};

const empty = <span className="text-neutral-400">—</span>;

export function VariationForms({ defaultVariation, defaultUsername, auid }: ProfileFormProps) {
  const actionToUse = defaultVariation ? updateVariationAction : createVariationAction;
  const [state, submitAction, isSubmitting] = useActionState(actionToUse, initialState);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (state.success) {
      setIsEditing(false);
    }
  }, [state.success]);

  const copyAuid = async () => {
    try {
      await navigator.clipboard.writeText(auid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy AUID", err);
    }
  };

  if (!isEditing) {
    const fullName = [defaultVariation?.firstName, defaultVariation?.lastName]
      .filter(Boolean)
      .join(" ");

    return (
      <section className={`${glassSurfaceStrong} p-6 sm:p-7`}>
        <PanelHeader
          title="Profile"
          subtitle="Your public identity"
          action={
            <TextAction onClick={() => setIsEditing(true)}>Edit</TextAction>
          }
        />

        {state.success ? (
          <div className="mt-5">
            <FormSuccess>{state.success}</FormSuccess>
          </div>
        ) : null}

        <dl className="mt-6 lg:grid lg:grid-cols-2 lg:gap-x-16">
          <DataRow label="Name">{fullName || empty}</DataRow>
          <DataRow label="Username">
            {defaultUsername ? `@${defaultUsername}` : empty}
          </DataRow>
          <div className="lg:col-span-2">
            <DataBlock label="Status">
              {defaultVariation?.status || empty}
            </DataBlock>
          </div>
          <div className="lg:col-span-2">
            <DataBlock label="Bio">
              {defaultVariation?.description ? (
                <span className="whitespace-pre-line">{defaultVariation.description}</span>
              ) : (
                empty
              )}
            </DataBlock>
          </div>
        </dl>

        <div className="mt-2 lg:mt-6">
          <p className="mb-2 text-[13px] text-neutral-400">Account ID</p>
          <CopyChip value={auid} copied={copied} onCopy={copyAuid} />
        </div>
      </section>
    );
  }

  return (
    <section className={`${glassSurfaceStrong} p-6 sm:p-7`}>
      <PanelHeader title="Edit profile" subtitle="Update your information" />

      <form action={submitAction} className="mt-6 space-y-5">
        {defaultVariation ? (
          <input type="hidden" name="variationId" value={defaultVariation.id} />
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            name="firstName"
            label="First name"
            placeholder="Jane"
            defaultValue={defaultVariation?.firstName ?? ""}
          />
          <Input
            name="lastName"
            label="Last name"
            placeholder="Doe"
            defaultValue={defaultVariation?.lastName ?? ""}
          />
        </div>

        <Input
          name="status"
          label="Status"
          placeholder="What's on your mind?"
          defaultValue={defaultVariation?.status ?? ""}
        />

        <div className="space-y-2">
          <label htmlFor="profile-description" className={fieldLabelClassName}>
            Bio
          </label>
          <textarea
            id="profile-description"
            name="description"
            placeholder="A few words about you..."
            defaultValue={defaultVariation?.description ?? ""}
            className={textareaClassName}
          />
        </div>

        {state.error ? <FormError>{state.error}</FormError> : null}
        {state.success ? <FormSuccess>{state.success}</FormSuccess> : null}

        <div className="flex gap-3 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsEditing(false)}
            className="flex-1"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" variant="brand" className="flex-1" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </section>
  );
}
