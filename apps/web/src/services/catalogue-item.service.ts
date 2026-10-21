import api from "../api/axios";
import type {
  CatalogueItem,
  CatalogueItemFormData,
  CatalogueItemListResult,
} from "../types/catalogue-item";

const catalogueItemService = {
  // Get catalogue items. Search and filters are optional.
  async list(params: {
    page?: number;
    limit?: number;
    search?: string;
    disciplineId?: number;
    categoryId?: number;
    unitId?: number;
    isActive?: boolean;
  } = {}): Promise<CatalogueItemListResult> {
    const response = await api.get("/catalogue", { params });
    return response.data;
  },

  // Create a catalogue item
  async create(data: CatalogueItemFormData): Promise<CatalogueItem> {
    const response = await api.post("/catalogue", data);
    return response.data;
  },

  // Update a catalogue item
  async update(id: number, data: CatalogueItemFormData): Promise<CatalogueItem> {
    const response = await api.put(`/catalogue/${id}`, data);
    return response.data;
  },

  // Activate or deactivate an item
  async updateStatus(id: number, isActive: boolean): Promise<CatalogueItem> {
    const response = await api.patch(`/catalogue-items/${id}/status`, { isActive });
    return response.data;
  },

  // Delete a catalogue item
  async delete(id: number): Promise<void> {
    await api.delete(`/catalogue/${id}`);
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

export default catalogueItemService;
