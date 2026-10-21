import api from "../api/axios";
import type {
  Category,
  CategoryFormData,
  CategoryListResult,
} from "../types/category";

const categoryService = {
  // Get categories. You can filter by discipline or search by name.
  async list(params: {
    page?: number;
    limit?: number;
    search?: string;
    disciplineId?: number;
    isActive?: boolean;
  } = {}): Promise<CategoryListResult> {
    const response = await api.get("/category", { params });
    return response.data;
  },

  // Create a category
  async create(data: CategoryFormData): Promise<Category> {
    const response = await api.post("/category", data);
    return response.data;
  },

  // Update a category
  async update(id: number, data: CategoryFormData): Promise<Category> {
    const response = await api.put(`/category/${id}`, data);
    return response.data;
  },

  // Activate or deactivate a category
  async updateStatus(id: number, isActive: boolean): Promise<Category> {
    const response = await api.patch(`/category/${id}/status`, { isActive });
    return response.data;
  },

  // Delete a category
  async delete(id: number): Promise<void> {
    await api.delete(`/category/${id}`);
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

export default categoryService;
