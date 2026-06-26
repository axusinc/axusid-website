"use client";

import { useActionState } from "react";
import {
  createVariationAction,
  setDefaultVariationAction,
  updateVariationAction,
  type VariationActionState,
} from "@/app/account/variation-actions";
import { Button } from "@/components/ui/button";
import { FormError, FormSuccess } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Variation = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  status: string | null;
  description: string | null;
};

type VariationFormsProps = {
  variations: Variation[];
  defaultVariationId: string | null;
};

const initialState: VariationActionState = {};

const textareaClassName =
  "flex min-h-24 w-full rounded-xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-black placeholder:text-neutral-400 backdrop-blur-sm transition focus:border-black/30 focus:outline-none focus:ring-4 focus:ring-black/5";

function formatVariationName(variation: Variation): string {
  return (
    [variation.firstName, variation.lastName].filter(Boolean).join(" ") ||
    "Untitled variation"
  );
}

function CreateVariationForm() {
  const [state, createVariation, creating] = useActionState(
    createVariationAction,
    initialState,
  );

  return (
    <section className="rounded-2xl border border-black/5 bg-white/70 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.06)] backdrop-blur-xl">
      <h2 className="text-lg font-semibold text-black">Create variation</h2>
      <p className="mt-2 text-sm text-neutral-500">
        Add a new profile persona to your identity.
      </p>
      <form action={createVariation} className="mt-4 space-y-4">
        <Input name="firstName" label="First name" placeholder="Jane" />
        <Input name="lastName" label="Last name" placeholder="Doe" />
        <Input name="status" label="Status" placeholder="Available" />
        <div className="space-y-2">
          <label
            htmlFor="create-description"
            className="text-sm font-medium text-neutral-700"
          >
            Description
          </label>
          <textarea
            id="create-description"
            name="description"
            placeholder="A short bio or note about this variation"
            className={textareaClassName}
          />
        </div>
        {state.error ? <FormError>{state.error}</FormError> : null}
        {state.success ? <FormSuccess>{state.success}</FormSuccess> : null}
        <Button type="submit" className="w-full" disabled={creating}>
          {creating ? "Creating..." : "Create variation"}
        </Button>
      </form>
    </section>
  );
}

type VariationCardProps = {
  variation: Variation;
  isDefault: boolean;
  defaultVariationId: string | null;
};

function VariationCard({
  variation,
  isDefault,
  defaultVariationId,
}: VariationCardProps) {
  const [updateState, updateVariation, updating] = useActionState(
    updateVariationAction,
    initialState,
  );
  const [defaultState, setDefault, settingDefault] = useActionState(
    setDefaultVariationAction,
    initialState,
  );

  return (
    <article className="rounded-xl border border-black/5 bg-white/80 p-4 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-black">
            {formatVariationName(variation)}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {variation.status ?? "No status"}
          </p>
          {variation.description ? (
            <p className="mt-2 text-xs text-neutral-600">
              {variation.description}
            </p>
          ) : null}
        </div>
        {isDefault ? (
          <span className="shrink-0 rounded-full bg-black px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-white">
            Default
          </span>
        ) : null}
      </div>

      <form action={updateVariation} className="mt-4 space-y-3 border-t border-black/5 pt-4">
        <input type="hidden" name="variationId" value={variation.id} />
        <Input
          name="firstName"
          label="First name"
          defaultValue={variation.firstName ?? ""}
        />
        <Input
          name="lastName"
          label="Last name"
          defaultValue={variation.lastName ?? ""}
        />
        <Input
          name="status"
          label="Status"
          defaultValue={variation.status ?? ""}
        />
        <div className="space-y-2">
          <label
            htmlFor={`description-${variation.id}`}
            className="text-sm font-medium text-neutral-700"
          >
            Description
          </label>
          <textarea
            id={`description-${variation.id}`}
            name="description"
            defaultValue={variation.description ?? ""}
            className={textareaClassName}
          />
        </div>
        {updateState.error ? (
          <FormError>{updateState.error}</FormError>
        ) : null}
        {updateState.success ? (
          <FormSuccess>{updateState.success}</FormSuccess>
        ) : null}
        <Button type="submit" variant="outline" className="w-full" disabled={updating}>
          {updating ? "Saving..." : "Save changes"}
        </Button>
      </form>

      {!isDefault ? (
        <form action={setDefault} className="mt-3">
          <input type="hidden" name="variationId" value={variation.id} />
          <input
            type="hidden"
            name="currentDefaultId"
            value={defaultVariationId ?? ""}
          />
          {defaultState.error ? (
            <FormError>{defaultState.error}</FormError>
          ) : null}
          {defaultState.success ? (
            <FormSuccess>{defaultState.success}</FormSuccess>
          ) : null}
          <Button
            type="submit"
            variant="outline"
            className={cn("w-full", defaultState.success && "mt-3")}
            disabled={settingDefault}
          >
            {settingDefault ? "Updating..." : "Set as default"}
          </Button>
        </form>
      ) : null}
    </article>
  );
}

export function VariationForms({
  variations,
  defaultVariationId,
}: VariationFormsProps) {
  return (
    <div className="mt-8 space-y-6">
      <div>
        <h2 className="text-sm font-medium uppercase tracking-[0.18em] text-neutral-400">
          Variations
        </h2>
        <p className="mt-2 text-sm text-neutral-500">
          Profile personas used for display names and OAuth profile claims.
        </p>
      </div>

      <CreateVariationForm />

      {variations.length === 0 ? (
        <p className="text-sm text-neutral-500">No variations yet.</p>
      ) : (
        <div className="space-y-4">
          {variations.map((variation) => (
            <VariationCard
              key={variation.id}
              variation={variation}
              isDefault={defaultVariationId === variation.id}
              defaultVariationId={defaultVariationId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
