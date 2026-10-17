import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Put this file at prisma/seed.ts if using these import paths.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type PermissionSeed = {
  code: string;
  name: string;
  description: string;
  scope: "platform" | "organization";
};

const permissions: PermissionSeed[] = [
  { code: "platform.dashboard.view", name: "View platform dashboard", description: "View platform-wide dashboard and metrics.", scope: "platform" },
  { code: "platform.organizations.view", name: "View organizations", description: "View all organizations on the platform.", scope: "platform" },
  { code: "platform.organizations.manage", name: "Manage organizations", description: "Create, update, suspend, and activate organizations.", scope: "platform" },
  { code: "platform.users.view", name: "View platform users", description: "View users across the platform.", scope: "platform" },
  { code: "platform.users.manage", name: "Manage platform users", description: "Manage platform user accounts.", scope: "platform" },
  { code: "platform.roles.manage", name: "Manage platform roles", description: "Create and update platform-level roles.", scope: "platform" },
  { code: "platform.permissions.manage", name: "Manage permissions", description: "Manage the platform permission catalogue.", scope: "platform" },
  { code: "platform.catalogue.manage", name: "Manage platform catalogue", description: "Manage default engineering catalogue data.", scope: "platform" },

  { code: "organization.dashboard.view", name: "View organization dashboard", description: "View the current organization's dashboard.", scope: "organization" },
  { code: "organization.members.view", name: "View organization members", description: "View members of the current organization.", scope: "organization" },
  { code: "organization.members.manage", name: "Manage organization members", description: "Invite, update, and deactivate organization members.", scope: "organization" },
  { code: "organization.roles.manage", name: "Manage organization roles", description: "Create custom roles and assign permissions within an organization.", scope: "organization" },
  { code: "projects.view", name: "View projects", description: "View projects belonging to the current organization.", scope: "organization" },
  { code: "projects.create", name: "Create projects", description: "Create projects for the current organization.", scope: "organization" },
  { code: "projects.edit", name: "Edit projects", description: "Update projects belonging to the current organization.", scope: "organization" },
  { code: "projects.delete", name: "Delete projects", description: "Delete projects when permitted by business rules.", scope: "organization" },
  { code: "estimates.view", name: "View estimates", description: "View BOQ estimates in the current organization.", scope: "organization" },
  { code: "estimates.create", name: "Create estimates", description: "Create BOQ estimates.", scope: "organization" },
  { code: "estimates.edit", name: "Edit estimates", description: "Edit draft estimates.", scope: "organization" },
  { code: "estimates.delete", name: "Delete estimates", description: "Delete estimates when permitted by business rules.", scope: "organization" },
  { code: "estimates.submit", name: "Submit estimates for review", description: "Submit estimates for review.", scope: "organization" },
  { code: "estimates.approve", name: "Approve estimates", description: "Approve estimates submitted for review.", scope: "organization" },
  { code: "catalogue.view", name: "View catalogue", description: "View available catalogue items and rates.", scope: "organization" },
  { code: "catalogue.manage", name: "Manage organization catalogue", description: "Manage organization-specific catalogue items and rates.", scope: "organization" },
  { code: "reports.view", name: "View reports", description: "View organization estimate and project reports.", scope: "organization" },
  { code: "reports.export", name: "Export reports", description: "Export organization reports.", scope: "organization" },
];

const organizationRoleSeeds = [
  { name: "Owner", code: "owner", description: "Full control of the organization.", permissions: ["organization.dashboard.view", "organization.members.view", "organization.members.manage", "organization.roles.manage", "projects.view", "projects.create", "projects.edit", "projects.delete", "estimates.view", "estimates.create", "estimates.edit", "estimates.delete", "estimates.submit", "estimates.approve", "catalogue.view", "catalogue.manage", "reports.view", "reports.export"] },
  { name: "Admin", code: "admin", description: "Manages organization members and day-to-day work.", permissions: ["organization.dashboard.view", "organization.members.view", "organization.members.manage", "organization.roles.manage", "projects.view", "projects.create", "projects.edit", "projects.delete", "estimates.view", "estimates.create", "estimates.edit", "estimates.delete", "estimates.submit", "estimates.approve", "catalogue.view", "catalogue.manage", "reports.view", "reports.export"] },
  { name: "Estimator", code: "estimator", description: "Creates and maintains estimates and project data.", permissions: ["organization.dashboard.view", "projects.view", "projects.create", "projects.edit", "estimates.view", "estimates.create", "estimates.edit", "estimates.submit", "catalogue.view", "reports.view", "reports.export"] },
  { name: "Viewer", code: "viewer", description: "Read-only access to projects, estimates, catalogue, and reports.", permissions: ["organization.dashboard.view", "projects.view", "estimates.view", "catalogue.view", "reports.view"] },
];

async function upsertGlobalRole(seed: { name: string; code: string; description: string; scope: "platform" | "organization" }) {
  // organizationId is null for shared role templates. FindFirst avoids relying
  // on a nullable compound unique selector.
  const existing = await prisma.role.findFirst({ where: { organizationId: null, code: seed.code } });
  if (existing) {
    return prisma.role.update({ where: { id: existing.id }, data: { ...seed, isSystem: true, isActive: true } });
  }
  return prisma.role.create({ data: { ...seed, organizationId: null, isSystem: true, isActive: true } });
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing from .env.");
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  if (!superAdminEmail) throw new Error("Add SUPER_ADMIN_EMAIL=<existing-super-admin-email> to .env.");

  const user = await prisma.user.findUnique({ where: { email: superAdminEmail } });
  if (!user) throw new Error(`No existing user found for SUPER_ADMIN_EMAIL=${superAdminEmail}.`);

  const permissionIds = new Map<string, string>();
  for (const permission of permissions) {
    const saved = await prisma.permission.upsert({
      where: { code: permission.code },
      update: { name: permission.name, description: permission.description, scope: permission.scope },
      create: permission,
    });
    permissionIds.set(saved.code, saved.id);
  }

  const superAdminRole = await upsertGlobalRole({ name: "Super Admin", code: "super_admin", description: "Full platform-level access.", scope: "platform" });
  for (const permission of permissions.filter((p) => p.scope === "platform")) {
    const permissionId = permissionIds.get(permission.code)!;
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: superAdminRole.id, permissionId } },
      update: {},
      create: { roleId: superAdminRole.id, permissionId },
    });
  }

  await prisma.userPlatformRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: superAdminRole.id } },
    update: {},
    create: { userId: user.id, roleId: superAdminRole.id },
  });

  // These are global templates. The next organization seed step should create
  // organization-specific copies with the same permission mappings.
  for (const seed of organizationRoleSeeds) {
    const role = await upsertGlobalRole({ name: seed.name, code: seed.code, description: seed.description, scope: "organization" });
    for (const code of seed.permissions) {
      const permissionId = permissionIds.get(code);
      if (!permissionId) throw new Error(`Unknown permission ${code} in role ${seed.code}.`);
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: {},
        create: { roleId: role.id, permissionId },
      });
    }
  }

  console.log(`Seed complete. Super Admin assigned to ${user.email}.`);
  console.log(`${permissions.length} permissions and ${organizationRoleSeeds.length + 1} role templates ensured.`);
}

main()
  .catch((error) => { console.error("Role/permission seed failed:", error); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
