import { create } from "zustand";
import authService from "../services/auth.service";
import type { AuthUser } from "../services/auth.service";

interface AuthState {
    user: AuthUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;

    setUser: (user: AuthUser | null) => void;
    setAuthenticated: (value: boolean) => void;

    loadUser: () => Promise<void>;

    hasPermission: (permission: string) => boolean;
    hasAnyPermission: (permissions: string[]) => boolean;
    hasRole: (roleCode: string) => boolean;
    clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,

    isAuthenticated: Boolean(localStorage.getItem("boq_access_token")),

    isLoading: false,

    setUser: (user) => set({ user }),

    setAuthenticated: (value) =>
        set({ isAuthenticated: value }),

    loadUser: async () => {
        const token = localStorage.getItem("boq_access_token");

        if (!token) {
            set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
            });
            return;
        }

        set({ isLoading: true });

        try {
            const response = await authService.me();

            if (!response || !response.isActive) {
                get().clearAuth();
                return;
            }

            set({
                user: response,
                isAuthenticated: true,
            });
        } catch (error) {
            // Only clear the session if the server rejects the token.
            // A network/server error should not automatically delete it.
            const status = (
                error as { response?: { status?: number } }
            ).response?.status;

            if (status === 401 || status === 403) {
                get().clearAuth();
            } else {
                console.error("Unable to restore authentication:", error);
            }
        } finally {
            set({ isLoading: false });
        }
    },

    hasPermission: (permission) => {
        const { user } = get();

        if (!user) return false;

        const platformPermission = user.platformRoles.some((role) =>
            role.permissions.includes(permission)
        );

        const organizationPermission = user.memberships.some((membership) =>
            membership.role.permissions.includes(permission)
        );

        return platformPermission || organizationPermission;
    },

    hasAnyPermission: (permissions) =>
        permissions.some((permission) =>
            get().hasPermission(permission)
        ),

    hasRole: (roleCode) => {
        const { user } = get();

        if (!user) return false;

        return (
            user.platformRoles.some((role) => role.code === roleCode) ||
            user.memberships.some(
                (membership) => membership.role.code === roleCode
            )
        );
    },

    clearAuth: () => {
        localStorage.removeItem("boq_access_token");

        set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
        });
    },
}));