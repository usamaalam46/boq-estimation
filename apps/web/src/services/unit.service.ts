import api from "../api/axios";
import type { Unit, UnitFormData, UnitListResult } from "../types/unit";

const unitService = {
  // Get units. Search by name or symbol.
  async list(params: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
  } = {}): Promise<UnitListResult> {
    const response = await api.get("/unit", { params });
    return response.data;
  },

  // Create a unit
  async create(data: UnitFormData): Promise<Unit> {
    const response = await api.post("/unit", data);
    return response.data;
  },

  // Update a unit
  async update(id: number, data: UnitFormData): Promise<Unit> {
    const response = await api.put(`/unit/${id}`, data);
    return response.data;
  },

  // Activate or deactivate a unit
  async updateStatus(id: number, isActive: boolean): Promise<Unit> {
    const response = await api.patch(`/unit/${id}/status`, { isActive });
    return response.data;
  },

  // Delete a unit
  async delete(id: number): Promise<void> {
    await api.delete(`/unit/${id}`);
  },

  // Show a useful error message
  errorMessage(error: unknown): string {
    if (typeof error === "object" && error !== null && "response" in error) {
      const response = (error as { response?: { data?: { message?: string } } }).response;
      if (response?.data?.message) return response.data.message;
    }

    if (error instanceof Error) return error.message;
    return "Something went wrong. Please try again.";
  },
};

export default unitService;
