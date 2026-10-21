
import api from "../api/axios.js";

export interface Project {
  id: number;
  organizationId: number;
  name: string;
  code: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    estimates: number;
  };
}

export interface ProjectPage {
  items: Project[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ProjectFilters {
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ProjectInput {
  name: string;
  code?: string | null;
  description?: string | null;
}

const projectsService = {
  async list(params: ProjectFilters = {}): Promise<ProjectPage> {
    const response = await api.get<ApiResponse<ProjectPage>>(
      "/projects",
      { params },
    );

    return response.data.data;
  },

  async create(input: ProjectInput): Promise<Project> {
    const response = await api.post<ApiResponse<Project>>(
      "/projects",
      input,
    );

    return response.data.data;
  },

  async update(
    id: number,
    input: Partial<ProjectInput>,
  ): Promise<Project> {
    const response = await api.put<ApiResponse<Project>>(
      `/projects/${id}`,
      input,
    );

    return response.data.data;
  },

  async remove(id: number): Promise<{ id: number }> {
    const response = await api.delete<ApiResponse<{ id: number }>>(
      `/projects/${id}`,
    );

    return response.data.data;
  },
};

export default projectsService;
