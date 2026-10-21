import { Router } from "express";
import prisma from "../config/prisma.js";
import { authenticate } from "../middleware/authenticate.js";
import {
  requirePlatformPermission,
  requireOrganizationPermission,
} from "../middleware/authorize.js";

const router = Router();

function positiveId(value: unknown): number | null {
  const text = String(value ?? "");
  if (!/^[1-9]\d*$/.test(text)) return null;
  const n = Number(text);
  return Number.isSafeInteger(n) ? n : null;
}

function normalizeCode(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function errorResponse(res: any, error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  const status = (error as { status?: number })?.status ?? 500;
  if (status >= 500) console.error("Role management error:", error);
  return res
    .status(status)
    .json({
      success: false,
      message: status >= 500 ? "An unexpected server error occurred." : message,
    });
}

async function replacePermissions(
  roleId: number,
  permissionIds: number[],
  scope: "platform" | "organization"
) {
  const uniqueIds = [...new Set(permissionIds)];
  const permissions = await prisma.permission.findMany({
    where: { id: { in: uniqueIds }, scope },
    select: { id: true },
  });
  if (permissions.length !== uniqueIds.length) {
    const error = new Error(
      `Only ${scope}-scope permissions may be assigned to this role.`
    );
    (error as any).status = 400;
    throw error;
  }
  await prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({ where: { roleId } });
    if (uniqueIds.length) {
      await tx.rolePermission.createMany({
        data: uniqueIds.map((permissionId) => ({ roleId, permissionId })),
        skipDuplicates: true,
      });
    }
  });
}

function parsePermissionIds(value: unknown): number[] {
  if (!Array.isArray(value)) {
    const error = new Error(
      "permissionIds must be an array of permission IDs."
    );
    (error as any).status = 400;
    throw error;
  }
  const ids = value.map(positiveId);
  if (ids.some((id) => id === null)) {
    const error = new Error("Every permission ID must be a positive integer.");
    (error as any).status = 400;
    throw error;
  }
  return ids as number[];
}

// PLATFORM: Super Admin or a user with platform.roles.manage.
router.get(
  "/platform/permissions",
  authenticate,
  requirePlatformPermission("platform.roles.manage"),
  async (_req, res) => {
    try {
      const data = await prisma.permission.findMany({
        where: { scope: "platform" },
        orderBy: { code: "asc" },
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          scope: true,
        },
      });
      return res.json({ success: true, data });
    } catch (error) {
      return errorResponse(res, error);
    }
  }
);

router.get(
  "/platform",
  authenticate,
  requirePlatformPermission("platform.roles.manage"),
  async (_req, res) => {
    try {
      const data = await prisma.role.findMany({
        where: { scope: "platform", organizationId: null, isActive: true },
        orderBy: [{ isSystem: "desc" }, { name: "asc" }],
        include: {
          rolePermissions: {
            include: {
              permission: {
                select: { id: true, code: true, name: true, scope: true },
              },
            },
          },
        },
      });
      return res.json({
        success: true,
        data: data.map((role) => ({
          id: role.id,
          name: role.name,
          code: role.code,
          description: role.description,
          scope: role.scope,
          isSystem: role.isSystem,
          permissions: role.rolePermissions.map((rp) => rp.permission),
        })),
      });
    } catch (error) {
      return errorResponse(res, error);
    }
  }
);

router.post(
  "/platform",
  authenticate,
  requirePlatformPermission("platform.roles.manage"),
  async (req, res) => {
    try {
      const name = String(req.body?.name ?? "").trim();
      const code = normalizeCode(req.body?.code || name);
      const description = String(req.body?.description ?? "").trim() || null;
      const permissionIds = parsePermissionIds(req.body?.permissionIds);
      if (!name || !code)
        return res
          .status(400)
          .json({ success: false, message: "Role name is required." });
      const role = await prisma.role.create({
        data: {
          name,
          code,
          description,
          scope: "platform",
          organizationId: null,
          isSystem: false,
          isActive: true,
        },
      });
      try {
        await replacePermissions(role.id, permissionIds, "platform");
      } catch (error) {
        await prisma.role.delete({ where: { id: role.id } });
        throw error;
      }
      return res.status(201).json({
        success: true,
        message: "Platform role created.",
        data: await prisma.role.findUnique({
          where: { id: role.id },
          include: { rolePermissions: { include: { permission: true } } },
        }),
      });
    } catch (error) {
      return errorResponse(res, error);
    }
  }
);

router.put(
  "/platform/:roleId/permissions",
  authenticate,
  requirePlatformPermission("platform.roles.manage"),
  async (req, res) => {
    try {
      const roleId = positiveId(req.params.roleId);
      if (!roleId)
        return res
          .status(400)
          .json({ success: false, message: "Invalid role ID." });
      const role = await prisma.role.findFirst({
        where: {
          id: roleId,
          scope: "platform",
          organizationId: null,
          isActive: true,
        },
      });
      if (!role)
        return res
          .status(404)
          .json({ success: false, message: "Platform role not found." });
      await replacePermissions(
        roleId,
        parsePermissionIds(req.body?.permissionIds),
        "platform"
      );
      const data = await prisma.role.findUnique({
        where: { id: roleId },
        include: { rolePermissions: { include: { permission: true } } },
      });
      return res.json({
        success: true,
        message: "Role permissions updated.",
        data,
      });
    } catch (error) {
      return errorResponse(res, error);
    }
  }
);

// ORGANIZATION: route is mounted at /organizations/:organizationId/roles.
router.get(
  "/organizations/:organizationId/permissions",
  authenticate,
  requireOrganizationPermission("organization.roles.manage"),
  async (_req, res) => {
    try {
      const data = await prisma.permission.findMany({
        where: { scope: "organization" },
        orderBy: { code: "asc" },
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          scope: true,
        },
      });
      return res.json({ success: true, data });
    } catch (error) {
      return errorResponse(res, error);
    }
  }
);

router.get(
  "/organizations/:organizationId",
  authenticate,
  requireOrganizationPermission("organization.roles.manage"),
  async (req, res) => {
    try {
      const organizationId = positiveId(req.params.organizationId);
      if (!organizationId)
        return res
          .status(400)
          .json({ success: false, message: "Invalid organization ID." });
      const data = await prisma.role.findMany({
        where: { scope: "organization", organizationId, isActive: true },
        orderBy: [{ isSystem: "desc" }, { name: "asc" }],
        include: {
          rolePermissions: {
            include: {
              permission: {
                select: { id: true, code: true, name: true, scope: true },
              },
            },
          },
          _count: { select: { members: true } },
        },
      });
      return res.json({
        success: true,
        data: data.map((role) => ({
          id: role.id,
          name: role.name,
          code: role.code,
          description: role.description,
          scope: role.scope,
          isSystem: role.isSystem,
          memberCount: role._count.members,
          permissions: role.rolePermissions.map((rp) => rp.permission),
        })),
      });
    } catch (error) {
      return errorResponse(res, error);
    }
  }
);

router.post(
  "/organizations/:organizationId",
  authenticate,
  requireOrganizationPermission("organization.roles.manage"),
  async (req, res) => {
    try {
      const organizationId = positiveId(req.params.organizationId);
      const name = String(req.body?.name ?? "").trim();
      const code = normalizeCode(req.body?.code || name);
      const description = String(req.body?.description ?? "").trim() || null;
      const permissionIds = parsePermissionIds(req.body?.permissionIds);
      if (!organizationId || !name || !code)
        return res
          .status(400)
          .json({
            success: false,
            message: "Organization ID and role name are required.",
          });

      // Admins may only grant permissions already assigned to their own active role in this organization.
      const userId = (req as any).auth.userId as number;
      const superAdmin = Boolean(
        await prisma.userPlatformRole.findFirst({
          where: {
            userId,
            role: { code: "super_admin", scope: "platform", isActive: true },
          },
          select: { userId: true },
        })
      );
      const actorMembership = superAdmin
        ? null
        : await prisma.organizationMember.findFirst({
          where: {
            organizationId,
            userId,
            organization: { isActive: true },
            role: { isActive: true, scope: "organization" },
          },
          include: {
            role: {
              include: { rolePermissions: { include: { permission: true } } },
            },
          },
        });
      if (!superAdmin && !actorMembership)
        return res
          .status(403)
          .json({
            success: false,
            message: "Organization membership required.",
          });
      const actorRoleCode = actorMembership?.role.code?.toLowerCase() ?? "";
      const isOrganizationOwner = ["owner", "organization-owner", "organization_owner", "org_owner"].includes(actorRoleCode);
      const heldCodes = new Set(
        actorMembership?.role.rolePermissions.map((rp) => rp.permission.code) ??
        []
      );
      const requested = await prisma.permission.findMany({
        where: { id: { in: permissionIds }, scope: "organization" },
        select: { id: true, code: true },
      });
      if (requested.length !== new Set(permissionIds).size)
        return res
          .status(400)
          .json({
            success: false,
            message: "Invalid organization permission selected.",
          });
      if (!superAdmin && !isOrganizationOwner && requested.some((p) => !heldCodes.has(p.code)))
        return res
          .status(403)
          .json({
            success: false,
            message: "You cannot grant permissions you do not have.",
          });

      const role = await prisma.role.create({
        data: {
          organizationId,
          name,
          code,
          description,
          scope: "organization",
          isSystem: false,
          isActive: true,
        },
      });
      try {
        await replacePermissions(role.id, permissionIds, "organization");
      } catch (error) {
        await prisma.role.delete({ where: { id: role.id } });
        throw error;
      }
      const data = await prisma.role.findUnique({
        where: { id: role.id },
        include: { rolePermissions: { include: { permission: true } } },
      });
      return res
        .status(201)
        .json({ success: true, message: "Organization role created.", data });
    } catch (error) {
      return errorResponse(res, error);
    }
  }
);

router.put(
  "/organizations/:organizationId/:roleId/permissions",
  authenticate,
  requireOrganizationPermission("organization.roles.manage"),
  async (req, res) => {
    try {
      const organizationId = positiveId(req.params.organizationId);
      const roleId = positiveId(req.params.roleId);
      if (!organizationId || !roleId)
        return res
          .status(400)
          .json({
            success: false,
            message: "Invalid organization or role ID.",
          });
      const role = await prisma.role.findFirst({
        where: {
          id: roleId,
          organizationId,
          scope: "organization",
          isActive: true,
        },
      });
      if (!role)
        return res
          .status(404)
          .json({ success: false, message: "Organization role not found." });
      const permissionIds = parsePermissionIds(req.body?.permissionIds);
      const userId = (req as any).auth.userId as number;
      const superAdmin = Boolean(
        await prisma.userPlatformRole.findFirst({
          where: {
            userId,
            role: { code: "super_admin", scope: "platform", isActive: true },
          },
          select: { userId: true },
        })
      );
      const actor = superAdmin
        ? null
        : await prisma.organizationMember.findFirst({
          where: {
            organizationId,
            userId,
            organization: { isActive: true },
            role: { isActive: true, scope: "organization" },
          },
          include: {
            role: {
              include: { rolePermissions: { include: { permission: true } } },
            },
          },
        });
      if (!superAdmin && !actor)
        return res
          .status(403)
          .json({
            success: false,
            message: "Organization membership required.",
          });
      const actorRoleCode = actor?.role.code?.toLowerCase() ?? "";
      const isOrganizationOwner = ["owner", "organization-owner", "organization_owner", "org_owner"].includes(actorRoleCode);
      const heldCodes = new Set(
        actor?.role.rolePermissions.map((rp) => rp.permission.code) ?? []
      );
      const requested = await prisma.permission.findMany({
        where: { id: { in: permissionIds }, scope: "organization" },
        select: { id: true, code: true },
      });
      if (requested.length !== new Set(permissionIds).size)
        return res
          .status(400)
          .json({
            success: false,
            message: "Invalid organization permission selected.",
          });
      if (!superAdmin && !isOrganizationOwner && requested.some((p) => !heldCodes.has(p.code)))
        return res
          .status(403)
          .json({
            success: false,
            message: "You cannot grant permissions you do not have.",
          });
      await replacePermissions(roleId, permissionIds, "organization");
      const data = await prisma.role.findUnique({
        where: { id: roleId },
        include: { rolePermissions: { include: { permission: true } } },
      });
      return res.json({
        success: true,
        message: "Role permissions updated.",
        data,
      });
    } catch (error) {
      return errorResponse(res, error);
    }
  }
);

export default router;
