import api from "../api/axios";

export type EstimateStatus = "draft" | "in_review" | "approved" | "archived";

export interface EstimateListItem {
  id: number;
  name: string;
  reference: string | null;
  status: EstimateStatus;
  currency: string;
  grandTotal: string | number;
  updatedAt: string;
  project: { id: number; name: string; code: string | null; organization: { id: number; name: string; slug: string } };
  createdBy: { id: number; name: string; email: string };
  _count: { sections: number };
}

export interface EstimatePayload {
  projectId: number;
  name: string;
  reference?: string | null;
  description?: string | null;
  currency: string;
  contingencyPercent: number;
  taxPercent: number;
  sections: Array<{
    name: string;
    description?: string | null;
    sortOrder: number;
    items: Array<{
      catalogueItemId?: number | null;
      unitId?: number;
      itemCode?: string | null;
      description: string;
      specification?: unknown;
      unitSymbol: string;
      quantity: number;
      rate: number;
      wastagePercent: number;
      remarks?: string | null;
      sortOrder: number;
    }>;
  }>;
}

export const estimatesService = {
  async list(params: { page?: number; pageSize?: number; search?: string; status?: EstimateStatus; projectId?: number } = {}) {
    const response = await api.get("/estimates", { params });
    return response.data as { success: boolean; data: EstimateListItem[]; pagination: { page: number; limit: number; total: number; totalPages: number } };
  },
  async get(id: number) {
    const response = await api.get(`/estimates/${id}`);
    return response.data.data;
  },
  async create(payload: EstimatePayload) {
    const response = await api.post("/estimates", payload);
    return response.data.data;
  },
  async updateDraft(id: number, payload: EstimatePayload) {
    const response = await api.put(`/estimates/${id}`, payload);
    return response.data.data;
  },
  async duplicate(id: number) {
    const response = await api.post(`/estimates/${id}/duplicate`);
    return response.data.data;
  },
  async removeDraft(id: number) {
    const response = await api.delete(`/estimates/${id}`);
    return response.data.data;
  },
};
