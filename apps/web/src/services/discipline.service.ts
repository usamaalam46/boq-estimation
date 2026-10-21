
import api from "../api/axios";
import type {
    Discipline,
    DisciplineFormData,
    DisciplineListResult,
} from "../types/discipline";

const disciplineService = {
    // Get all disciplines
    async list(params: {
        page?: number;
        limit?: number;
        search?: string;
        isActive?: boolean;
    } = {}): Promise<DisciplineListResult> {
        const response = await api.get("/discipline", { params });

        return response.data;
    },

    // Create a discipline
    async create(data: DisciplineFormData): Promise<Discipline> {
        const response = await api.post("/discipline", data);

        return response.data;
    },

    // Update a discipline
    async update(
        id: number,
        data: DisciplineFormData,
    ): Promise<Discipline> {
        const response = await api.put(`/discipline/${id}`, data);

        return response.data;
    },

    // Activate or deactivate a discipline
    async updateStatus(
        id: number,
        isActive: boolean,
    ): Promise<Discipline> {
        const response = await api.patch(
            `/discipline/${id}/status`,
            { isActive },
        );

        return response.data;
    },

    // Delete a discipline
    async delete(id: number): Promise<void> {
        await api.delete(`/discipline/${id}`);
    },
};

export default disciplineService;
