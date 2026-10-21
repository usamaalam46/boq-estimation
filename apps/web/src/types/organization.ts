export interface OrganizationOwner {
    id: number;
    name: string;
    email: string;
    isActive: boolean;
    role?: { id: string; name: string; code: string };
    joinedAt?: string;
}
export interface Organization {
    id: number;
    name: string;
    slug: string;
    address: string | null;
    location: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt?: string;
    owner?: OrganizationOwner | null;
    _count?: { members: number; projects: number };
}
export interface CreateOrganizationData {
    name: string;
    address: string;
    location: string;
    ownerName: string;
    ownerEmail: string;
}
export interface UpdateOrganizationData {
    name: string;
    address: string;
    location: string;
}
export interface OrganizationListResult {
    data: Organization[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
