import type {
  NameElementInput,
  NamePartType,
  NameSeparatorType,
} from "@/graphql/sdk";

export const namePartTypes = [
  "TITLE",
  "GIVEN_NAME",
  "FAMILY_NAME",
  "GENERATION",
  "CREDENTIAL",
  "UNSTRUCTURED",
] as const satisfies readonly NamePartType[];

export const nameSeparatorTypes = [
  "SPACE",
  "HYPHEN",
  "COMMA_SPACE",
  "APOSTROPHE",
] as const satisfies readonly NameSeparatorType[];

export type ProfileNameElement = {
  partType: NamePartType | null;
  separatorType: NameSeparatorType | null;
  value: string | null;
};

export type ProfileName = {
  displayName: string;
  elements: ProfileNameElement[];
};

const namePartTypeSet = new Set<string>(namePartTypes);
const nameSeparatorTypeSet = new Set<string>(nameSeparatorTypes);

export function buildSimpleNameElements(
  firstName?: string,
  lastName?: string,
): NameElementInput[] {
  const elements: NameElementInput[] = [];

  if (firstName) {
    elements.push({ partType: "GIVEN_NAME", value: firstName });
  }
  if (firstName && lastName) {
    elements.push({ separatorType: "SPACE" });
  }
  if (lastName) {
    elements.push({ partType: "FAMILY_NAME", value: lastName });
  }

  return elements;
}

export function readNamePart(
  elements: readonly ProfileNameElement[],
  partType: NamePartType,
): string | null {
  const separators: Record<NameSeparatorType, string> = {
    SPACE: " ",
    HYPHEN: "-",
    COMMA_SPACE: ", ",
    APOSTROPHE: "'",
  };
  let result = "";
  let pendingSeparator: string | null = null;

  for (const element of elements) {
    if (element.separatorType) {
      pendingSeparator = separators[element.separatorType];
      continue;
    }

    const value = element.value?.trim();
    if (element.partType === partType && value) {
      result += result ? (pendingSeparator ?? " ") + value : value;
    }
    if (element.partType) {
      pendingSeparator = null;
    }
  }

  return result || null;
}

export function parseNameElementsJson(value: FormDataEntryValue | null): NameElementInput[] {
  if (typeof value !== "string") {
    throw new Error("Name details are required.");
  }

  let input: unknown;
  try {
    input = JSON.parse(value);
  } catch {
    throw new Error("Name details are invalid.");
  }

  if (!Array.isArray(input) || input.length === 0) {
    throw new Error("Add at least one name part.");
  }
  if (input.length > 32) {
    throw new Error("A name can contain at most 32 parts and separators.");
  }

  const elements: NameElementInput[] = input.map((rawElement) => {
    if (!rawElement || typeof rawElement !== "object" || Array.isArray(rawElement)) {
      throw new Error("Each name item must be a part or separator.");
    }

    const element = rawElement as Record<string, unknown>;
    const partType = element.partType;
    const separatorType = element.separatorType;
    const hasPart = typeof partType === "string" && namePartTypeSet.has(partType);
    const hasSeparator =
      typeof separatorType === "string" && nameSeparatorTypeSet.has(separatorType);

    if (hasPart === hasSeparator) {
      throw new Error("Each name item must be exactly one part or separator.");
    }

    if (hasPart) {
      const partValue = typeof element.value === "string" ? element.value.trim() : "";
      if (!partValue) {
        throw new Error("Name parts cannot be empty.");
      }
      if (partValue.length > 200) {
        throw new Error("Each name part must be 200 characters or fewer.");
      }
      return { partType: partType as NamePartType, value: partValue };
    }

    return { separatorType: separatorType as NameSeparatorType };
  });

  for (let index = 0; index < elements.length; index += 1) {
    const isSeparator = Boolean(elements[index].separatorType);
    if (isSeparator && (index === 0 || index === elements.length - 1)) {
      throw new Error("A name cannot begin or end with a separator.");
    }

    const previousIsSeparator = index > 0 && Boolean(elements[index - 1].separatorType);
    if (isSeparator === previousIsSeparator && index > 0) {
      throw new Error("Name parts and separators must alternate.");
    }
  }

  return elements;
}
