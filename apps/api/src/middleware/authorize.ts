
import type { NextFunction, Response } from "express";
import prisma from "../config/prisma.js";
import type { AuthenticatedRequest } from "./authenticate.js";

/**
 * Checks whether the authenticated user has an active Super Admin role.
 * User IDs are integers in the database.
 */
async function isSuperAdmin(userId: number): Promise<boolean> {
    const assignment = await prisma.userPlatformRole.findFirst({
        where: {
            userId,
            role: {
                code: "super_admin",
                scope: "platform",
                isActive: true,
            },
        },
        select: {
            userId: true,
        },
    });

    return Boolean(assignment);
}

/**
 * Requires an authenticated Super Admin.
 */
export function requireSuperAdmin(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    void (async () => {
        const userId = req.auth?.userId;

        if (userId === undefined) {
            return res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
        }

        if (!(await isSuperAdmin(userId))) {
            return res.status(403).json({
                success: false,
                message: "Super Admin access required.",
            });
        }

        return next();
    })().catch((error: unknown) => {
        console.error("Super Admin authorization error:", error);

        if (!res.headersSent) {
            return res.status(500).json({
                success: false,
                message: "An unexpected server error occurred.",
            });
        }
    });
}

/**
 * Requires a specific platform permission.
 * Super Admin has platform-wide access.
 */
export function requirePlatformPermission(permissionCode: string) {
    return (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction
    ) => {
        void (async () => {
            const userId = req.auth?.userId;

            if (userId === undefined) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication required.",
                });
            }

            if (await isSuperAdmin(userId)) {
                return next();
            }

            const assignment = await prisma.userPlatformRole.findFirst({
                where: {
                    userId,
                    role: {
                        scope: "platform",
                        isActive: true,
                        rolePermissions: {
                            some: {
                                permission: {
                                    code: permissionCode,
                                    scope: "platform",
                                },
                            },
                        },
                    },
                },
                select: {
                    userId: true,
                },
            });

            if (!assignment) {
                return res.status(403).json({
                    success: false,
                    message:
                        "You do not have permission to perform this action.",
                    requiredPermission: permissionCode,
                });
            }

            return next();
        })().catch((error: unknown) => {
            console.error("Platform permission check error:", error);

            if (!res.headersSent) {
                return res.status(500).json({
                    success: false,
                    message: "An unexpected server error occurred.",
                });
            }
        });
    };
}

/**
 * Requires an active organization and the specified organization permission.
 *
 * Expected route:
 * /api/organizations/:organizationId/...
 *
 * Both organizationId and userId are integer IDs.
 */
export function requireOrganizationPermission(permissionCode: string) {
    return (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction
    ) => {
        void (async () => {
            const userId = req.auth?.userId;

            if (userId === undefined) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication required.",
                });
            }

            const organizationIdParam = req.params.organizationId;

            const organizationIdString = Array.isArray(organizationIdParam)
                ? organizationIdParam[0]
                : organizationIdParam;

            // Express route parameters are strings, even when IDs are integers.
            if (
                typeof organizationIdString !== "string" ||
                !/^[1-9]\d*$/.test(organizationIdString)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "A valid organization ID is required.",
                });
            }

            const organizationId = Number(organizationIdString);

            if (!Number.isSafeInteger(organizationId)) {
                return res.status(400).json({
                    success: false,
                    message: "A valid organization ID is required.",
                });
            }

            const organization = await prisma.organization.findUnique({
                where: {
                    id: organizationId,
                },
                select: {
                    id: true,
                    isActive: true,
                },
            });

            if (!organization || !organization.isActive) {
                return res.status(404).json({
                    success: false,
                    message: "Organization not found or inactive.",
                });
            }

            // Super Admin can access any existing active organization.
            if (await isSuperAdmin(userId)) {
                return next();
            }

            const membership = await prisma.organizationMember.findFirst({
                where: {
                    userId,
                    organizationId,
                    organization: {
                        isActive: true,
                    },
                    role: {
                        isActive: true,
                        scope: "organization",
                        rolePermissions: {
                            some: {
                                permission: {
                                    code: permissionCode,
                                    scope: "organization",
                                },
                            },
                        },
                    },
                },
                select: {
                    id: true,
                },
            });

            if (!membership) {
                return res.status(403).json({
                    success: false,
                    message:
                        "You do not have access to this organization or the required permission.",
                    requiredPermission: permissionCode,
                });
            }

            return next();
        })().catch((error: unknown) => {
            console.error("Organization permission check error:", error);

            if (!res.headersSent) {
                return res.status(500).json({
                    success: false,
                    message: "An unexpected server error occurred.",
                });
            }
        });
    };
}
