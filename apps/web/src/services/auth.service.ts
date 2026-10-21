
import api from "../api/axios";

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface AuthRole {
    id: number;
    name: string;
    code: string;
    permissions: string[];
}

export interface AuthOrganization {
    id: number;
    name: string;
    slug: string;
}

export interface AuthMembership {
    organization: AuthOrganization;
    role: AuthRole;
}

export interface AuthUser {
    id: number;
    name: string;
    email: string;
    isActive: boolean;
    platformRoles: AuthRole[];
    memberships: AuthMembership[];
}

export interface LoginResponse {
    success: boolean;
    token: string;
    user: AuthUser;
}

export interface CurrentUserResponse {
    success: boolean;
    user: AuthUser;
}

const authService = {
    async login(
        credentials: LoginCredentials
    ): Promise<LoginResponse> {
        const response = await api.post<LoginResponse>(
            "/auth/login",
            credentials
        );

        return response.data;
    },

    async me(): Promise<AuthUser> {
        const response = await api.get<CurrentUserResponse>(
            "/auth/me"
        );

        return response.data.user;
    },
};

export default authService;
