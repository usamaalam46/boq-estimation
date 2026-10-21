export interface CatalogueItem {
  id: number;
  scope: "platform" | "organization";
  organizationId: number | null;
  disciplineId: number;
  categoryId: number;
  unitId: number;
  code: string | null;
  name: string;
  description: string | null;
  specification: Record<string, unknown> | null;
  defaultWastagePercent: number | string | null;
  isActive: boolean;
  discipline?: { id: number; name: string; code: string };
  category?: { id: number; name: string; code: string | null };
  unit?: { id: number; name: string; symbol: string };
}

export interface CatalogueItemFormData {
  scope: "platform";
  disciplineId: number;
  categoryId: number;
  unitId: number;
  code: string;
  name: string;
  description: string;
  specification: Record<string, unknown> | null;
  defaultWastagePercent: number | null;
}

export interface CatalogueItemPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CatalogueItemListResult {
  data: CatalogueItem[];
  pagination: CatalogueItemPagination;
}
