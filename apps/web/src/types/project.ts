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