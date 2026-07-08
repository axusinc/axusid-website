"use client";

import { useActionState, useEffect, useState } from "react";
import {
  changeUsernameAction,
  updateVariationFieldAction,
  type VariationActionState,
} from "@/app/account/variation-actions";
import {
  CopyChip,
  DataBlock,
  DataRow,
  glassSurfaceStrong,
  inlineInputClassName,
  inlineTextareaClassName,
  InlineEditActions,
  PanelHeader,
  TextAction,
} from "@/app/account/dashboard-ui";
import { FormError, FormSuccess } from "@/components/ui/form-message";

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

type EditableField = "name" | "username" | "status" | "description";

const initialState: VariationActionState = {};

const empty = <span className="text-neutral-400">—</span>;

function EditableNameField({
  variation,
  onDone,
}: {
  variation: Variation;
  onDone: () => void;
}) {
  const formId = `edit-name-${variation.id}`;
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
    <DataRow
      label="Name"
      action={
        <InlineEditActions
          formId={formId}
          onCancel={onDone}
          isSubmitting={isSubmitting}
        />
      }
    >
      <form id={formId} action={submitAction}>
        <input type="hidden" name="variationId" value={variation.id} />
        <input type="hidden" name="field" value="name" />
        <div className="grid w-full grid-cols-2 gap-2">
          <input
            name="firstName"
            placeholder="First name"
            defaultValue={variation.firstName ?? ""}
            className={inlineInputClassName}
            autoFocus
          />
          <input
            name="lastName"
            placeholder="Last name"
            defaultValue={variation.lastName ?? ""}
            className={inlineInputClassName}
          />
        </div>
      </form>
      {state.error ? (
        <p className="mt-2">
          <FormError>{state.error}</FormError>
        </p>
      ) : null}
    </DataRow>
  );
}

function EditableUsernameField({
  defaultUsername,
  onDone,
}: {
  defaultUsername: string;
  onDone: () => void;
}) {
  const formId = `edit-username-${defaultUsername}`;
  const [state, submitAction, isSubmitting] = useActionState(
    changeUsernameAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      onDone();
    }
  }, [state.success, onDone]);

  return (
    <DataRow
      label="Username"
      action={
        <InlineEditActions
          formId={formId}
          onCancel={onDone}
          isSubmitting={isSubmitting}
        />
      }
    >
      <form id={formId} action={submitAction}>
        <input type="hidden" name="oldUsername" value={defaultUsername} />
        <input
          name="newUsername"
          placeholder="New username"
          defaultValue={defaultUsername}
          className={inlineInputClassName}
          autoFocus
        />
      </form>
      {state.error ? (
        <p className="mt-2">
          <FormError>{state.error}</FormError>
        </p>
      ) : null}
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
  const formId = `edit-status-${variation.id}`;
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
    <DataBlock
      label="Status"
      action={
        <InlineEditActions
          formId={formId}
          onCancel={onDone}
          isSubmitting={isSubmitting}
        />
      }
    >
      <form id={formId} action={submitAction}>
        <input type="hidden" name="variationId" value={variation.id} />
        <input type="hidden" name="field" value="status" />
        <input
          name="status"
          placeholder="What's on your mind?"
          defaultValue={variation.status ?? ""}
          className={inlineInputClassName}
          autoFocus
        />
      </form>
      {state.error ? (
        <p className="mt-2">
          <FormError>{state.error}</FormError>
        </p>
      ) : null}
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
  const formId = `edit-bio-${variation.id}`;
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
    <DataBlock
      label="Bio"
      action={
        <InlineEditActions
          formId={formId}
          onCancel={onDone}
          isSubmitting={isSubmitting}
        />
      }
    >
      <form id={formId} action={submitAction}>
        <input type="hidden" name="variationId" value={variation.id} />
        <input type="hidden" name="field" value="description" />
        <textarea
          name="description"
          placeholder="A few words about you..."
          defaultValue={variation.description ?? ""}
          className={inlineTextareaClassName}
          autoFocus
        />
      </form>
      {state.error ? (
        <p className="mt-2">
          <FormError>{state.error}</FormError>
        </p>
      ) : null}
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

          {editingField === "username" && defaultUsername ? (
            <EditableUsernameField
              defaultUsername={defaultUsername}
              onDone={finishEditing}
            />
          ) : (
            <DataRow
              label="Username"
              action={
                defaultUsername ? (
                  <TextAction onClick={() => setEditingField("username")}>Edit</TextAction>
                ) : undefined
              }
            >
              {defaultUsername ? `@${defaultUsername}` : empty}
            </DataRow>
          )}

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
