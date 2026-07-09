"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, type KeyboardEvent, type RefObject } from "react";
import {
  changeUsernameAction,
  updateVariationFieldAction,
  type VariationActionState,
} from "@/app/account/variation-actions";
import {
  CopyChip,
  DataBlock,
  DataRow,
  inlineInputClassName,
  inlineTextareaClassName,
  InlineEditActions,
  PanelHeader,
} from "@/app/account/dashboard-ui";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  onEditingChange?: (editing: boolean) => void;
  cancelRef?: RefObject<(() => void) | null>;
};

type EditableField = "name" | "username" | "status" | "description";

const initialState: VariationActionState = {};

const empty = <span className="text-neutral-400">—</span>;

function handleFormKeyDown(
  event: KeyboardEvent<HTMLFormElement>,
  onCancel: () => void,
  options: { submitOnEnter?: boolean; isTextarea?: boolean } = {},
) {
  if (event.key === "Escape") {
    event.preventDefault();
    onCancel();
    return;
  }

  if (options.submitOnEnter && event.key === "Enter" && !options.isTextarea) {
    event.preventDefault();
    event.currentTarget.requestSubmit();
    return;
  }

  if (
    options.isTextarea &&
    event.key === "Enter" &&
    (event.metaKey || event.ctrlKey)
  ) {
    event.preventDefault();
    event.currentTarget.requestSubmit();
  }
}

function EditableNameField({
  variation,
  onDone,
  onCancel,
}: {
  variation: Variation;
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const formId = `edit-name-${variation.id}`;
  const [state, submitAction, isSubmitting] = useActionState(
    updateVariationFieldAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      onDone(state.success);
    }
  }, [state.success, onDone]);

  return (
    <DataRow
      label="Name"
      action={
        <InlineEditActions
          formId={formId}
          onCancel={onCancel}
          isSubmitting={isSubmitting}
        />
      }
    >
      <form
        id={formId}
        action={submitAction}
        onKeyDown={(event) => handleFormKeyDown(event, onCancel, { submitOnEnter: true })}
      >
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
  onCancel,
}: {
  defaultUsername: string;
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const formId = `edit-username-${defaultUsername}`;
  const [state, submitAction, isSubmitting] = useActionState(
    changeUsernameAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      onDone(state.success);
    }
  }, [state.success, onDone]);

  return (
    <DataRow
      label="Username"
      action={
        <InlineEditActions
          formId={formId}
          onCancel={onCancel}
          isSubmitting={isSubmitting}
        />
      }
    >
      <form
        id={formId}
        action={submitAction}
        onKeyDown={(event) => handleFormKeyDown(event, onCancel, { submitOnEnter: true })}
      >
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
  onCancel,
}: {
  variation: Variation;
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const formId = `edit-status-${variation.id}`;
  const [state, submitAction, isSubmitting] = useActionState(
    updateVariationFieldAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      onDone(state.success);
    }
  }, [state.success, onDone]);

  return (
    <DataBlock
      label="Status"
      action={
        <InlineEditActions
          formId={formId}
          onCancel={onCancel}
          isSubmitting={isSubmitting}
        />
      }
    >
      <form
        id={formId}
        action={submitAction}
        onKeyDown={(event) => handleFormKeyDown(event, onCancel, { submitOnEnter: true })}
      >
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
  onCancel,
}: {
  variation: Variation;
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const formId = `edit-bio-${variation.id}`;
  const [state, submitAction, isSubmitting] = useActionState(
    updateVariationFieldAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      onDone(state.success);
    }
  }, [state.success, onDone]);

  return (
    <DataBlock
      label="Bio"
      action={
        <InlineEditActions
          formId={formId}
          onCancel={onCancel}
          isSubmitting={isSubmitting}
        />
      }
    >
      <form
        id={formId}
        action={submitAction}
        onKeyDown={(event) => handleFormKeyDown(event, onCancel, { isTextarea: true })}
      >
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

function fieldActionLabel(hasValue: boolean) {
  return hasValue ? "Edit" : "Add";
}

export function VariationForms({
  defaultVariation,
  defaultUsername,
  auid,
  onEditingChange,
  cancelRef,
}: ProfileFormProps) {
  const router = useRouter();
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const cancelEditing = () => {
    setEditingField(null);
  };

  const finishEditing = (message: string) => {
    setEditingField(null);
    setBanner(message);
    router.refresh();
    setTimeout(() => setBanner(null), 3000);
  };

  useEffect(() => {
    onEditingChange?.(editingField !== null);
  }, [editingField, onEditingChange]);

  useEffect(() => {
    if (cancelRef) {
      cancelRef.current = cancelEditing;
    }
  });

  const copyAuid = async () => {
    try {
      await navigator.clipboard.writeText(auid);
      setCopied(true);
      setCopyError(null);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError("Unable to copy. Select and copy manually.");
      setTimeout(() => setCopyError(null), 3000);
    }
  };

  const fullName = [defaultVariation?.firstName, defaultVariation?.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <Card className="p-6 sm:p-8">
      <PanelHeader title="Profile" subtitle="Your public identity" />

      {banner ? (
        <div className="mt-5">
          <FormSuccess>{banner}</FormSuccess>
        </div>
      ) : null}

      {!defaultVariation ? (
        <p className="mt-6 text-sm text-neutral-500">
          No profile found. Contact support if this looks wrong.
        </p>
      ) : (
        <dl className="mt-6">
          {editingField === "name" ? (
            <EditableNameField
              variation={defaultVariation}
              onDone={finishEditing}
              onCancel={cancelEditing}
            />
          ) : (
            <DataRow
              label="Name"
              action={
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 px-3"
                  onClick={() => setEditingField("name")}
                >
                  {fieldActionLabel(Boolean(fullName))}
                </Button>
              }
            >
              {fullName || empty}
            </DataRow>
          )}

          {editingField === "username" && defaultUsername ? (
            <EditableUsernameField
              defaultUsername={defaultUsername}
              onDone={finishEditing}
              onCancel={cancelEditing}
            />
          ) : (
            <DataRow
              label="Username"
              action={
                defaultUsername ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 px-3"
                    onClick={() => setEditingField("username")}
                  >
                    Edit
                  </Button>
                ) : undefined
              }
            >
              {defaultUsername ? `@${defaultUsername}` : empty}
            </DataRow>
          )}

          {editingField === "status" ? (
            <EditableStatusField
              variation={defaultVariation}
              onDone={finishEditing}
              onCancel={cancelEditing}
            />
          ) : (
            <DataBlock
              label="Status"
              action={
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 px-3"
                  onClick={() => setEditingField("status")}
                >
                  {fieldActionLabel(Boolean(defaultVariation.status))}
                </Button>
              }
            >
              {defaultVariation.status || empty}
            </DataBlock>
          )}

          {editingField === "description" ? (
            <EditableBioField
              variation={defaultVariation}
              onDone={finishEditing}
              onCancel={cancelEditing}
            />
          ) : (
            <DataBlock
              label="Bio"
              action={
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 px-3"
                  onClick={() => setEditingField("description")}
                >
                  {fieldActionLabel(Boolean(defaultVariation.description))}
                </Button>
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
        <p className="mb-2 text-sm font-medium text-neutral-700">Account ID</p>
        <CopyChip value={auid} copied={copied} onCopy={copyAuid} />
        {copyError ? (
          <p className="mt-2">
            <FormError>{copyError}</FormError>
          </p>
        ) : null}
      </div>
    </Card>
  );
}
