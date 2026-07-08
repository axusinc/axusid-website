"use client";

import { useActionState, useEffect, useState } from "react";
import {
  updateVariationFieldAction,
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

type EditableField = "name" | "status" | "description";

const initialState: VariationActionState = {};

const empty = <span className="text-neutral-400">—</span>;

function FieldActions({
  onCancel,
  isSubmitting,
}: {
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  return (
    <div className="flex gap-3 pt-1">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        className="flex-1"
        disabled={isSubmitting}
      >
        Cancel
      </Button>
      <Button type="submit" variant="brand" className="flex-1" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}

function EditableNameField({
  variation,
  onDone,
}: {
  variation: Variation;
  onDone: () => void;
}) {
  const [state, submitAction, isSubmitting] = useActionState(
    updateVariationFieldAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      onDone();
    }
  }, [state.success, onDone]);

  return (
    <DataRow label="Name">
      <form action={submitAction} className="space-y-4">
        <input type="hidden" name="variationId" value={variation.id} />
        <input type="hidden" name="field" value="name" />
        <Input
          name="firstName"
          label="First name"
          placeholder="Jane"
          defaultValue={variation.firstName ?? ""}
        />
        <Input
          name="lastName"
          label="Last name"
          placeholder="Doe"
          defaultValue={variation.lastName ?? ""}
        />
        {state.error ? <FormError>{state.error}</FormError> : null}
        {state.success ? <FormSuccess>{state.success}</FormSuccess> : null}
        <FieldActions onCancel={onDone} isSubmitting={isSubmitting} />
      </form>
    </DataRow>
  );
}

function EditableStatusField({
  variation,
  onDone,
}: {
  variation: Variation;
  onDone: () => void;
}) {
  const [state, submitAction, isSubmitting] = useActionState(
    updateVariationFieldAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      onDone();
    }
  }, [state.success, onDone]);

  return (
    <DataBlock label="Status">
      <form action={submitAction} className="space-y-4">
        <input type="hidden" name="variationId" value={variation.id} />
        <input type="hidden" name="field" value="status" />
        <Input
          name="status"
          label="Status"
          placeholder="What's on your mind?"
          defaultValue={variation.status ?? ""}
        />
        {state.error ? <FormError>{state.error}</FormError> : null}
        {state.success ? <FormSuccess>{state.success}</FormSuccess> : null}
        <FieldActions onCancel={onDone} isSubmitting={isSubmitting} />
      </form>
    </DataBlock>
  );
}

function EditableBioField({
  variation,
  onDone,
}: {
  variation: Variation;
  onDone: () => void;
}) {
  const [state, submitAction, isSubmitting] = useActionState(
    updateVariationFieldAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      onDone();
    }
  }, [state.success, onDone]);

  return (
    <DataBlock label="Bio">
      <form action={submitAction} className="space-y-4">
        <input type="hidden" name="variationId" value={variation.id} />
        <input type="hidden" name="field" value="description" />
        <div className="space-y-2">
          <label htmlFor="profile-description" className={fieldLabelClassName}>
            Bio
          </label>
          <textarea
            id="profile-description"
            name="description"
            placeholder="A few words about you..."
            defaultValue={variation.description ?? ""}
            className={textareaClassName}
          />
        </div>
        {state.error ? <FormError>{state.error}</FormError> : null}
        {state.success ? <FormSuccess>{state.success}</FormSuccess> : null}
        <FieldActions onCancel={onDone} isSubmitting={isSubmitting} />
      </form>
    </DataBlock>
  );
}

export function VariationForms({ defaultVariation, defaultUsername, auid }: ProfileFormProps) {
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [copied, setCopied] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const copyAuid = async () => {
    try {
      await navigator.clipboard.writeText(auid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy AUID", err);
    }
  };

  const finishEditing = () => {
    setEditingField(null);
    setBanner("Profile updated.");
    setTimeout(() => setBanner(null), 3000);
  };

  const fullName = [defaultVariation?.firstName, defaultVariation?.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={`${glassSurfaceStrong} p-6 sm:p-7`}>
      <PanelHeader title="Profile" subtitle="Your public identity" />

      {banner ? (
        <div className="mt-5">
          <FormSuccess>{banner}</FormSuccess>
        </div>
      ) : null}

      {!defaultVariation ? (
        <p className="mt-6 text-[13px] text-neutral-500">
          No profile found. Contact support if this looks wrong.
        </p>
      ) : (
        <dl className="mt-6">
          {editingField === "name" ? (
            <EditableNameField variation={defaultVariation} onDone={finishEditing} />
          ) : (
            <DataRow
              label="Name"
              action={
                <TextAction onClick={() => setEditingField("name")}>Edit</TextAction>
              }
            >
              {fullName || empty}
            </DataRow>
          )}

          <DataRow label="Username">
            {defaultUsername ? `@${defaultUsername}` : empty}
          </DataRow>

          {editingField === "status" ? (
            <EditableStatusField variation={defaultVariation} onDone={finishEditing} />
          ) : (
            <DataBlock
              label="Status"
              action={
                <TextAction onClick={() => setEditingField("status")}>Edit</TextAction>
              }
            >
              {defaultVariation.status || empty}
            </DataBlock>
          )}

          {editingField === "description" ? (
            <EditableBioField variation={defaultVariation} onDone={finishEditing} />
          ) : (
            <DataBlock
              label="Bio"
              action={
                <TextAction onClick={() => setEditingField("description")}>Edit</TextAction>
              }
            >
              {defaultVariation.description ? (
                <span className="whitespace-pre-line">{defaultVariation.description}</span>
              ) : (
                empty
              )}
            </DataBlock>
          )}
        </dl>
      )}

      <div className="mt-2">
        <p className="mb-2 text-[13px] text-neutral-400">Account ID</p>
        <CopyChip value={auid} copied={copied} onCopy={copyAuid} />
      </div>
    </section>
  );
}
