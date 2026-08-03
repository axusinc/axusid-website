"use client";

import { useRouter } from "next/navigation";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { GripVertical } from "lucide-react";
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
  SubsectionTitle,
} from "@/app/account/dashboard-ui";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormError, FormSuccess } from "@/components/ui/form-message";
import type { NamePartType, NameSeparatorType } from "@/graphql/sdk";
import {
  buildSimpleNameElements,
  namePartTypes,
  nameSeparatorTypes,
  readNamePart,
  type ProfileName,
  type ProfileNameElement,
} from "@/lib/profile-name";

type Variation = {
  id: string;
  name: ProfileName | null;
  displayName: string | null;
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

const namePartLabels: Record<NamePartType, string> = {
  TITLE: "Title",
  GIVEN_NAME: "Given name",
  FAMILY_NAME: "Family name",
  GENERATION: "Generation / suffix",
  CREDENTIAL: "Credential",
  UNSTRUCTURED: "Unstructured name",
};

const nameSeparatorLabels: Record<NameSeparatorType, string> = {
  SPACE: "Space",
  HYPHEN: "Hyphen (-)",
  COMMA_SPACE: "Comma + space (, )",
  APOSTROPHE: "Apostrophe (')",
};

type EditableNamePart = {
  id: string;
  partType: NamePartType;
  value: string;
  separatorBefore: NameSeparatorType;
};

function editableNameParts(
  elements: readonly {
    partType?: NamePartType | null;
    separatorType?: NameSeparatorType | null;
    value?: string | null;
  }[],
): EditableNamePart[] {
  const parts: EditableNamePart[] = [];
  let separatorBefore: NameSeparatorType = "SPACE";

  for (const element of elements) {
    if (element.separatorType) {
      separatorBefore = element.separatorType;
    } else if (element.partType) {
      parts.push({
        id: `initial-name-part-${parts.length}`,
        partType: element.partType,
        value: element.value ?? "",
        separatorBefore,
      });
      separatorBefore = "SPACE";
    }
  }

  return parts;
}

function serializeNameParts(parts: readonly EditableNamePart[]): ProfileNameElement[] {
  return parts.flatMap((part, index) => [
    ...(index > 0
      ? [{ partType: null, separatorType: part.separatorBefore, value: null }]
      : []),
    { partType: part.partType, separatorType: null, value: part.value },
  ]);
}

function hasComplexNameElements(elements: readonly ProfileNameElement[]): boolean {
  if (!elements || elements.length === 0) return false;
  return elements.some((el) => {
    if (el.partType && el.partType !== "GIVEN_NAME" && el.partType !== "FAMILY_NAME") {
      return true;
    }
    if (el.separatorType && el.separatorType !== "SPACE") {
      return true;
    }
    return false;
  });
}

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
  const nextPartId = useRef(0);

  const initialElements = variation.name?.elements ?? [];
  const isComplex = hasComplexNameElements(initialElements);
  const [isAdvanced, setIsAdvanced] = useState(isComplex);

  const [firstName, setFirstName] = useState(
    () => variation.firstName ?? readNamePart(initialElements, "GIVEN_NAME") ?? "",
  );
  const [lastName, setLastName] = useState(
    () => variation.lastName ?? readNamePart(initialElements, "FAMILY_NAME") ?? "",
  );

  const [parts, setParts] = useState<EditableNamePart[]>(() => {
    const existing = editableNameParts(initialElements);
    return existing.length > 0
      ? existing
      : [
          {
            id: "initial-name-part-0",
            partType: "GIVEN_NAME",
            value: "",
            separatorBefore: "SPACE",
          },
        ];
  });
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<"top" | "bottom" | null>(null);

  const [state, submitAction, isSubmitting] = useActionState(
    updateVariationFieldAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      onDone(state.success);
    }
  }, [state.success, onDone]);

  const updatePart = (id: string, patch: Partial<EditableNamePart>) => {
    setParts((current) =>
      current.map((part) => (part.id === id ? { ...part, ...patch } : part)),
    );
  };

  const movePart = (index: number, direction: -1 | 1) => {
    setParts((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const reordered = [...current];
      [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
      return reordered;
    });
  };

  const reorderParts = (fromIndex: number, targetInsertionIndex: number) => {
    if (fromIndex < 0 || targetInsertionIndex < 0) return;
    setParts((current) => {
      if (fromIndex >= current.length) return current;
      const updated = [...current];
      const [moved] = updated.splice(fromIndex, 1);
      const insertAt =
        fromIndex < targetInsertionIndex
          ? Math.min(targetInsertionIndex - 1, updated.length)
          : Math.min(targetInsertionIndex, updated.length);
      updated.splice(insertAt, 0, moved);
      return updated;
    });
  };

  const handleDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    index: number,
  ) => {
    const target = event.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "SELECT" ||
      target.closest("button")
    ) {
      event.preventDefault();
      return;
    }
    setDraggedIndex(index);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (
    event: React.DragEvent<HTMLDivElement>,
    index: number,
  ) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    const rect = event.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position: "top" | "bottom" = event.clientY < midY ? "top" : "bottom";

    if (dragOverIndex !== index || dragOverPosition !== position) {
      setDragOverIndex(index);
      setDragOverPosition(position);
    }
  };

  const handleDrop = (
    event: React.DragEvent<HTMLDivElement>,
    index: number,
  ) => {
    event.preventDefault();
    if (draggedIndex !== null && dragOverPosition !== null) {
      const targetInsertionIndex = dragOverPosition === "top" ? index : index + 1;
      reorderParts(draggedIndex, targetInsertionIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDragOverPosition(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDragOverPosition(null);
  };

  const removePart = (id: string) => {
    setParts((current) => current.filter((part) => part.id !== id));
  };

  const addPart = () => {
    const id = `new-name-part-${nextPartId.current}`;
    nextPartId.current += 1;
    setParts((current) => [
      ...current,
      {
        id,
        partType: "GIVEN_NAME",
        value: "",
        separatorBefore: "SPACE",
      },
    ]);
  };

  return (
    <DataBlock
      label="Name"
      hint={
        isAdvanced
          ? "Build your display name from ordered parts (drag handle to reorder)"
          : "Enter your first and last name"
      }
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
        onKeyDown={(event) =>
          handleFormKeyDown(event, onCancel, { submitOnEnter: !isAdvanced })
        }
      >
        <input type="hidden" name="variationId" value={variation.id} />
        <input type="hidden" name="field" value="name" />
        <input
          type="hidden"
          name="nameElements"
          value={JSON.stringify(
            isAdvanced
              ? serializeNameParts(parts)
              : buildSimpleNameElements(firstName, lastName),
          )}
        />

        {!isAdvanced ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">
                First name
              </label>
              <input
                type="text"
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={inlineInputClassName}
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">
                Last name
              </label>
              <input
                type="text"
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={inlineInputClassName}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
          {parts.map((part, index) => {
            const isDragOverTop =
              dragOverIndex === index &&
              dragOverPosition === "top" &&
              draggedIndex !== index;
            const isDragOverBottom =
              dragOverIndex === index &&
              dragOverPosition === "bottom" &&
              draggedIndex !== index;

            return (
              <div key={part.id} className="relative">
                {isDragOverTop ? (
                  <div className="absolute -top-1.5 left-0 right-0 z-10 flex items-center gap-1 pointer-events-none">
                    <div className="h-2 w-2 rounded-full bg-blue-600 shadow-sm" />
                    <div className="h-0.5 flex-1 bg-blue-600 rounded-full shadow-sm" />
                    <div className="h-2 w-2 rounded-full bg-blue-600 shadow-sm" />
                  </div>
                ) : null}

                <div
                  draggable
                  onDragStart={(event) => handleDragStart(event, index)}
                  onDragOver={(event) => handleDragOver(event, index)}
                  onDrop={(event) => handleDrop(event, index)}
                  onDragEnd={handleDragEnd}
                  className={`grid gap-2 rounded-xl border p-2 transition-all sm:grid-cols-[auto_140px_160px_minmax(0,1fr)_auto] ${
                    draggedIndex === index
                      ? "border-dashed border-neutral-300 bg-neutral-100 opacity-40"
                      : "border-black/[0.06] bg-neutral-50/70"
                  }`}
                >
                  <div
                    className="flex items-center justify-center text-neutral-400 hover:text-neutral-700 px-1 cursor-grab active:cursor-grabbing select-none"
                    title="Drag to reorder"
                    aria-label="Drag handle to reorder name part"
                  >
                    <GripVertical className="h-4 w-4" />
                  </div>

                  {index === 0 ? (
                    <div className="hidden items-center px-2 text-xs text-neutral-400 sm:flex">
                      Starts with
                    </div>
                  ) : (
                    <select
                      aria-label={`Separator before name part ${index + 1}`}
                      value={part.separatorBefore}
                      onChange={(event) =>
                        updatePart(part.id, {
                          separatorBefore: event.target.value as NameSeparatorType,
                        })
                      }
                      className={inlineInputClassName}
                    >
                      {nameSeparatorTypes.map((separatorType) => (
                        <option key={separatorType} value={separatorType}>
                          {nameSeparatorLabels[separatorType]}
                        </option>
                      ))}
                    </select>
                  )}

                  <select
                    aria-label={`Type of name part ${index + 1}`}
                    value={part.partType}
                    onChange={(event) =>
                      updatePart(part.id, {
                        partType: event.target.value as NamePartType,
                      })
                    }
                    className={inlineInputClassName}
                  >
                    {namePartTypes.map((partType) => (
                      <option key={partType} value={partType}>
                        {namePartLabels[partType]}
                      </option>
                    ))}
                  </select>

                  <input
                    aria-label={`Value of name part ${index + 1}`}
                    placeholder={namePartLabels[part.partType]}
                    value={part.value}
                    onChange={(event) => updatePart(part.id, { value: event.target.value })}
                    className={inlineInputClassName}
                    required
                    maxLength={200}
                    autoFocus={index === 0}
                  />

                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => movePart(index, -1)}
                      disabled={index === 0}
                      aria-label={`Move name part ${index + 1} up`}
                      className="h-8 w-8 rounded-lg text-neutral-500 hover:bg-black/[0.05] hover:text-black disabled:opacity-25"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => movePart(index, 1)}
                      disabled={index === parts.length - 1}
                      aria-label={`Move name part ${index + 1} down`}
                      className="h-8 w-8 rounded-lg text-neutral-500 hover:bg-black/[0.05] hover:text-black disabled:opacity-25"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removePart(part.id)}
                      aria-label={`Remove name part ${index + 1}`}
                      className="h-8 w-8 rounded-lg text-neutral-500 hover:bg-red-50 hover:text-red-700"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {isDragOverBottom ? (
                  <div className="absolute -bottom-1.5 left-0 right-0 z-10 flex items-center gap-1 pointer-events-none">
                    <div className="h-2 w-2 rounded-full bg-blue-600 shadow-sm" />
                    <div className="h-0.5 flex-1 bg-blue-600 rounded-full shadow-sm" />
                    <div className="h-2 w-2 rounded-full bg-blue-600 shadow-sm" />
                  </div>
                ) : null}
              </div>
            );
          })}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-2">
          {isAdvanced ? (
            <>
              <button
                type="button"
                onClick={addPart}
                disabled={parts.length >= 16}
                className="text-sm font-medium text-neutral-500 transition-colors hover:text-black disabled:opacity-40"
              >
                + Add name part
              </button>
              <button
                type="button"
                onClick={() => {
                  const serialized = serializeNameParts(parts);
                  setFirstName(readNamePart(serialized, "GIVEN_NAME") ?? "");
                  setLastName(readNamePart(serialized, "FAMILY_NAME") ?? "");
                  setIsAdvanced(false);
                }}
                className="text-xs text-neutral-400 hover:text-neutral-700 underline-offset-4 hover:underline"
              >
                Switch to simple field
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setParts(
                  editableNameParts(buildSimpleNameElements(firstName, lastName)),
                );
                setIsAdvanced(true);
              }}
              className="text-xs text-neutral-400 hover:text-neutral-700 underline-offset-4 hover:underline"
            >
              + Advanced name builder
            </button>
          )}
        </div>
      </form>
      {state.error ? (
        <p className="mt-2">
          <FormError>{state.error}</FormError>
        </p>
      ) : null}
    </DataBlock>
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
      hint="Used to sign in and identify your account"
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
      label="Status message"
      hint="A short line shown on your profile"
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
      hint="A longer description about you"
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

  const fullName = defaultVariation?.displayName?.trim() || "";

  return (
    <Card>
      {banner ? (
        <div className="mb-5">
          <FormSuccess>{banner}</FormSuccess>
        </div>
      ) : null}

      {!defaultVariation ? (
        <p className="text-sm text-neutral-500">
          No profile found. Contact support if this looks wrong.
        </p>
      ) : (
        <dl className="[&>div:first-child]:pt-0">
          {editingField === "name" ? (
            <EditableNameField
              variation={defaultVariation}
              onDone={finishEditing}
              onCancel={cancelEditing}
            />
          ) : (
            <DataRow
              label="Name"
              hint="Your display name"
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
              hint="Used to sign in and identify your account"
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
              label="Status message"
              hint="A short line shown on your profile"
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
              hint="A longer description about you"
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

      <div className="mt-6 border-t border-black/[0.04] pt-6">
        <SubsectionTitle
          title="AUID"
          description="Your unique AXUS ID. Share with support if you need help with your account."
        />
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
