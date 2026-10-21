
import { create } from "zustand";
import  authService  from "../services/auth.service";
import type {
    AuthUser,
    AuthRole,
    AuthMembership,
} from "../services/auth.service";

const TOKEN_KEY = "boq_access_token";
const SUPER_ADMIN_ROLE = "super_admin";

interface AuthState {
    user: AuthUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isInitialized: boolean;

    setUser: (user: AuthUser | null) => void;
    setAuthenticated: (value: boolean) => void;

    loadUser: () => Promise<void>;
    refreshUser: () => Promise<AuthUser | null>;

    hasPermission: (permission: string) => boolean;
    hasAnyPermission: (permissions: string[]) => boolean;
    hasOrganizationPermission: (
        organizationId: number,
        permission: string
    ) => boolean;

    hasRole: (roleCode: string) => boolean;
    isSuperAdmin: () => boolean;
    clearAuth: () => void;
}

function normalizeCode(code: string): string {
    return code.trim().toLowerCase();
}

function hasPermissionInRoles(
    roles: AuthRole[],
    permission: string
): boolean {
    return roles.some((role) =>
        role.permissions.includes(permission)
    );
}

function getPlatformRoles(user: AuthUser): AuthRole[] {
    return user.platformRoles ?? [];
}

function getMemberships(user: AuthUser): AuthMembership[] {
    return user.memberships ?? [];
}

function isSuperAdminUser(user: AuthUser | null): boolean {
    if (!user) return false;

    return getPlatformRoles(user).some(
        (role) => normalizeCode(role.code) === SUPER_ADMIN_ROLE
    );
}

function getErrorStatus(error: unknown): number | undefined {
    const err = error as {
        response?: { status?: number };
    };

    return err?.response?.status;
}

export const useAuthStore = create<AuthState>((set, get) => {
    let refreshPromise: Promise<AuthUser | null> | null = null;
    let loadPromise: Promise<void> | null = null;

    async function fetchCurrentUser(): Promise<AuthUser | null> {
        const token = localStorage.getItem(TOKEN_KEY);

        if (!token) {
            set({
                user: null,
                isAuthenticated: false,
            });

            return null;
        }

        try {
            const user = await authService.me();

            if (!user || !user.isActive) {
                localStorage.removeItem(TOKEN_KEY);

                set({
                    user: null,
                    isAuthenticated: false,
                });

                return null;
            }

            set({
                user,
                isAuthenticated: true,
            });

            return user;
        } catch (error) {
            const status = getErrorStatus(error);

            if (status === 401 || status === 403) {
                localStorage.removeItem(TOKEN_KEY);

                set({
                    user: null,
                    isAuthenticated: false,
                });
            } else {
                console.error("Unable to refresh authenticated user:", error);
            }

            return null;
        }
    }

    return {
        user: null,
        isAuthenticated: Boolean(localStorage.getItem(TOKEN_KEY)),
        isLoading: false,
        isInitialized: false,

        setUser: (user) => {
            set({
                user,
                isAuthenticated: Boolean(
                    user && localStorage.getItem(TOKEN_KEY)
                ),
            });
        },

        setAuthenticated: (value) => {
            set({ isAuthenticated: value });
        },

        /**
         * Refreshes the current user from the backend.
         * Call this after changing role permissions so
         * the sidebar receives the latest permissions.
         */
        refreshUser: async () => {
            if (refreshPromise) {
                return refreshPromise;
            }

            refreshPromise = fetchCurrentUser();

            try {
                return await refreshPromise;
            } finally {
                refreshPromise = null;
            }
        },

        /**
         * Initializes authentication when the application starts.
         */
        loadUser: async () => {
            if (get().isLoading) return;
            if (loadPromise) return loadPromise;

            loadPromise = (async () => {
                set({ isLoading: true });

                try {
                    await get().refreshUser();
                } finally {
                    set({
                        isLoading: false,
                        isInitialized: true,
                    });

                    loadPromise = null;
                }
            })();

            return loadPromise;
        },

        /**
         * Checks platform-wide permissions and permissions
         * from the user's organization memberships.
         *
         * Use hasOrganizationPermission() when a specific
         * organization must be checked.
         */
        hasPermission: (permission) => {
            const user = get().user;

            if (!user) return false;
            if (isSuperAdminUser(user)) return true;

            const platformAllowed = hasPermissionInRoles(
                getPlatformRoles(user),
                permission
            );

            if (platformAllowed) return true;

            return getMemberships(user).some((membership) =>
                membership.role.permissions.includes(permission)
            );
        },

        hasAnyPermission: (permissions) => {
            if (permissions.length === 0) return true;

            return permissions.some((permission) =>
                get().hasPermission(permission)
            );
        },

        /**
         * Checks permission within one specific organization.
         * Permissions from other organizations cannot grant access.
         */
        hasOrganizationPermission: (
            organizationId,
            permission
        ) => {
            const user = get().user;

            if (!user) return false;
            if (isSuperAdminUser(user)) return true;

            return getMemberships(user).some(
                (membership) =>
                    membership.organization.id === organizationId &&
                    membership.role.permissions.includes(permission)
            );
        },

        hasRole: (roleCode) => {
            const user = get().user;

            if (!user) return false;

            const expectedCode = normalizeCode(roleCode);

            const platformMatch = getPlatformRoles(user).some(
                (role) => normalizeCode(role.code) === expectedCode
            );

            if (platformMatch) return true;

            return getMemberships(user).some(
                (membership) =>
                    normalizeCode(membership.role.code) === expectedCode
            );
        },

        isSuperAdmin: () => isSuperAdminUser(get().user),

        clearAuth: () => {
            localStorage.removeItem(TOKEN_KEY);

            set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                isInitialized: true,
            });
        },
    };
});
