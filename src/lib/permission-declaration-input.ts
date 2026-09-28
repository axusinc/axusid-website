import { z } from "zod";
import type { SchemaPermissionDeclarationInput } from "@/graphql/sdk";

const optionalText = z.string().max(8192).nullish();
const length = z.number().int().min(0).max(2147483647).nullish();
const parameter = z.object({
  name: z.string().min(1).max(256),
  type: z.enum(["STRING", "INTEGER", "LONG", "DOUBLE", "BOOLEAN", "AUID"]).nullish(),
  allowWildcard: z.boolean().nullish(),
  allowedValues: z.array(z.string().max(1024)).max(1000).nullish(),
  regex: optionalText, minLength: length, maxLength: length,
  minNumber: z.number().finite().nullish(), maxNumber: z.number().finite().nullish(),
  label: optionalText, description: optionalText, icon: optionalText, hint: optionalText,
}).strict().superRefine((param, ctx) => {
  if (param.minLength != null && param.maxLength != null && param.minLength > param.maxLength) ctx.addIssue({ code: "custom", message: "minLength must not exceed maxLength" });
  if (param.minNumber != null && param.maxNumber != null && param.minNumber > param.maxNumber) ctx.addIssue({ code: "custom", message: "minNumber must not exceed maxNumber" });
});
export const permissionDeclarationSchema = z.object({
  name: z.string().trim().min(1).max(256),
  template: z.string().min(1).max(4096),
  params: z.array(parameter).max(100).default([]),
  validatorUrl: z.url().refine((value) => /^https?:\/\//.test(value), "Use an HTTP(S) validator URL").nullish(),
  combinationInvariantJs: optionalText, title: optionalText, description: optionalText, icon: optionalText,
  order: z.number().int().min(-2147483648).max(2147483647).nullish(),
}).strict().superRefine((declaration, ctx) => {
  const names = declaration.params.map((param) => param.name);
  if (new Set(names).size !== names.length) ctx.addIssue({ code: "custom", message: "Parameter names must be unique" });
  const used = new Set<string>();
  for (const segment of declaration.template.split(".")) {
    if (!segment || segment === "*" || segment === "?") ctx.addIssue({ code: "custom", message: "Template literals cannot be empty, * or ?" });
    const match = /^\{([^{}]+)\}$/.exec(segment);
    if (match) { used.add(match[1]); if (!names.includes(match[1])) ctx.addIssue({ code: "custom", message: `Missing definition for ${match[1]}` }); }
  }
  for (const name of names) if (!used.has(name)) ctx.addIssue({ code: "custom", message: `Parameter ${name} must occur in the template` });
});

export function parseDeclarationJson(json: string): { declaration: SchemaPermissionDeclarationInput; error?: never } | { declaration?: never; error: string } {
  let value: unknown;
  try { value = JSON.parse(json); } catch { return { error: "Enter valid JSON for the complete declaration." }; }
  const parsed = permissionDeclarationSchema.safeParse(value);
  if (!parsed.success) return { error: parsed.error.issues.map((issue) => `${issue.path.join(".") || "Declaration"}: ${issue.message}`).slice(0, 4).join(". ") };
  return { declaration: parsed.data };
}

export const declarationExample = {
  name: "section.posts.create", template: "section.{section}.posts.create",
  params: [{ name: "section", type: "STRING", allowWildcard: true, allowedValues: ["news", "community"], label: "Section", hint: "Choose the section where posts may be created." }],
  title: "Create posts in {section}", description: "Create posts in the {section} section.", icon: "file-plus", order: 10,
};
