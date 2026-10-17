
import api from "../api/axios";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  platformRole: "super_admin" | "user";
  isActive: boolean;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

const authService = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>("/auth/login",credentials);

    return response.data;
  },
};

export default authService;
