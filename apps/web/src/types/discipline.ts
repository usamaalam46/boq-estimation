export interface Discipline {
  id: number;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DisciplineFormData {
  name: string;
  code: string;
  description: string;
}

export interface DisciplinePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DisciplineListResult {
  data: Discipline[];
  pagination: DisciplinePagination;
}
