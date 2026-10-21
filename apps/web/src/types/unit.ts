export interface Unit {
  id: number;
  name: string;
  symbol: string;
  description: string | null;
  dimension: string | null;
  isActive: boolean;
  createdAt?: string;
}

export interface UnitFormData {
  name: string;
  symbol: string;
  description: string;
  dimension: string;
}

export interface UnitPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface UnitListResult {
  data: Unit[];
  pagination: UnitPagination;
}
