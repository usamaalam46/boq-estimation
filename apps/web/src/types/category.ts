export interface Category {
  id: number;
  disciplineId: number;
  parentId: number | null;
  name: string;
  code: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  discipline?: {
    id: number;
    name: string;
    code: string;
  };
  parent?: {
    id: number;
    name: string;
  } | null;
}

export interface CategoryFormData {
  disciplineId: number;
  parentId: number | null;
  name: string;
  code: string;
  description: string;
  sortOrder: number;
}

export interface CategoryPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CategoryListResult {
  data: Category[];
  pagination: CategoryPagination;
}
