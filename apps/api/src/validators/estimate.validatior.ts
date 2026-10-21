export type EstimateItemInput = {
  catalogueItemId?: number | null;
  itemCode?: string | null;
  description: string;
  specification?: unknown;
  unitId?: number;
  unitSymbol: string;
  quantity: number;
  rate: number;
  wastagePercent?: number;
  remarks?: string | null;
  sortOrder?: number;
};

export type EstimateSectionInput = {
  name: string;
  description?: string | null;
  sortOrder?: number;
  items: EstimateItemInput[];
};

export type CreateEstimateInput = {
  projectId: number;
  name: string;
  reference?: string | null;
  description?: string | null;
  currency?: string;
  contingencyPercent?: number;
  taxPercent?: number;
  status?: "draft" | "in_review" | "approved" | "archived";
  sections: EstimateSectionInput[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const optionalText = (value: unknown, max: number, field: string) => {
  if (value == null) return;
  if (typeof value !== "string" || value.length > max) throw Object.assign(new Error(`${field} must be text with at most ${max} characters.`), { status: 422 });
};

export function validateEstimateBody(body: unknown): CreateEstimateInput {
  if (!isRecord(body)) throw Object.assign(new Error("A valid estimate payload is required."), { status: 422 });
  const { projectId, name, reference, description, currency, contingencyPercent, taxPercent, status, sections } = body;
  if (!Number.isSafeInteger(projectId) || Number(projectId) < 1) throw Object.assign(new Error("A valid projectId is required."), { status: 422 });
  if (typeof name !== "string" || !name.trim() || name.trim().length > 180) throw Object.assign(new Error("Estimate name is required (maximum 180 characters)."), { status: 422 });
  optionalText(reference, 100, "Reference");
  optionalText(description, 4000, "Description");
  if (currency !== undefined && (typeof currency !== "string" || !/^[A-Z]{3}$/.test(currency))) throw Object.assign(new Error("Currency must be a three-letter code such as PKR."), { status: 422 });
  if (status !== undefined && !["draft", "in_review", "approved", "archived"].includes(String(status))) {
    throw Object.assign(new Error("Invalid estimate status."), { status: 422 });
  }
  const contingency = contingencyPercent === undefined ? 0 : contingencyPercent;
  const tax = taxPercent === undefined ? 0 : taxPercent;
  if (!isFiniteNumber(contingency) || contingency < 0 || contingency > 100) throw Object.assign(new Error("Contingency must be between 0 and 100."), { status: 422 });
  if (!isFiniteNumber(tax) || tax < 0 || tax > 100) throw Object.assign(new Error("Tax must be between 0 and 100."), { status: 422 });
  if (!Array.isArray(sections) || sections.length > 100) throw Object.assign(new Error("Sections must be an array with no more than 100 sections."), { status: 422 });

  let itemCount = 0;
  const normalizedSections = sections.map((section, sectionIndex) => {
    if (!isRecord(section) || typeof section.name !== "string" || !section.name.trim() || section.name.length > 160) throw Object.assign(new Error(`Section ${sectionIndex + 1} needs a name (maximum 160 characters).`), { status: 422 });
    optionalText(section.description, 2000, "Section description");
    if (!Array.isArray(section.items)) throw Object.assign(new Error(`Items for section ${sectionIndex + 1} must be an array.`), { status: 422 });
    itemCount += section.items.length;
    const items = section.items.map((item, itemIndex) => {
      if (!isRecord(item)) throw Object.assign(new Error("Each BOQ item must be an object."), { status: 422 });
      if (typeof item.description !== "string" || !item.description.trim() || item.description.length > 2000) throw Object.assign(new Error(`Item ${itemIndex + 1} in section ${sectionIndex + 1} needs a description.`), { status: 422 });
      if (typeof item.unitSymbol !== "string" || !item.unitSymbol.trim() || item.unitSymbol.length > 24) throw Object.assign(new Error(`Item ${itemIndex + 1} needs a valid unit.`), { status: 422 });
      for (const [field, value] of [["quantity", item.quantity], ["rate", item.rate]] as const) {
        if (!isFiniteNumber(value) || value < 0 || value > 1_000_000_000_000) throw Object.assign(new Error(`${field} must be a non-negative finite number.`), { status: 422 });
      }
      const wastage = item.wastagePercent === undefined ? 0 : item.wastagePercent;
      if (!isFiniteNumber(wastage) || wastage < 0 || wastage > 100) throw Object.assign(new Error("Wastage must be between 0 and 100."), { status: 422 });
      if (item.unitId !== undefined && (!Number.isSafeInteger(item.unitId) || Number(item.unitId) < 1)) throw Object.assign(new Error("unitId must be a positive integer."), { status: 422 });
      if (item.catalogueItemId != null && (!Number.isSafeInteger(item.catalogueItemId) || Number(item.catalogueItemId) < 1)) throw Object.assign(new Error("catalogueItemId must be a positive integer."), { status: 422 });
      optionalText(item.itemCode, 80, "Item code");
      optionalText(item.remarks, 2000, "Item remarks");
      return {
        ...(item.catalogueItemId != null ? { catalogueItemId: Number(item.catalogueItemId) } : {}),
        ...(item.unitId !== undefined ? { unitId: Number(item.unitId) } : {}),
        itemCode: typeof item.itemCode === "string" && item.itemCode.trim() ? item.itemCode.trim() : null,
        description: item.description.trim(),
        specification: item.specification ?? undefined,
        unitSymbol: item.unitSymbol.trim(),
        quantity: item.quantity as number,
        rate: item.rate as number,
        wastagePercent: wastage as number,
        remarks: typeof item.remarks === "string" && item.remarks.trim() ? item.remarks.trim() : null,
        sortOrder: Number.isSafeInteger(item.sortOrder) && Number(item.sortOrder) >= 0 ? Number(item.sortOrder) : itemIndex,
      };
    });
    return {
      name: section.name.trim(),
      description: typeof section.description === "string" && section.description.trim() ? section.description.trim() : null,
      sortOrder: Number.isSafeInteger(section.sortOrder) && Number(section.sortOrder) >= 0 ? Number(section.sortOrder) : sectionIndex,
      items,
    };
  });
  if (itemCount > 2000) throw Object.assign(new Error("An estimate cannot contain more than 2,000 items."), { status: 422 });
  return {
    projectId: Number(projectId), name: name.trim(),
    reference: typeof reference === "string" && reference.trim() ? reference.trim() : null,
    description: typeof description === "string" && description.trim() ? description.trim() : null,
    currency: typeof currency === "string" ? currency : "PKR",
    contingencyPercent: contingency, taxPercent: tax,
    ...(status !== undefined ? { status: status as CreateEstimateInput["status"] } : {}),
    sections: normalizedSections,
  };
}
