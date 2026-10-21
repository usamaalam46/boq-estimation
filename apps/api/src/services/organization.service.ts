import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import prisma from "../config/prisma.js";
import { sendOwnerWelcomeEmail } from "./organization-email.service.js";

export interface CreateOrganizationInput { name: string; address?: string | null; location?: string | null; ownerName: string; ownerEmail: string; }
export interface UpdateOrganizationInput { name?: string; address?: string | null; location?: string | null; isActive?: boolean; }
const orgSelect = { id: true, name: true, slug: true, address: true, location: true, isActive: true, createdAt: true, updatedAt: true, _count: { select: { members: true, projects: true } } } as const;
const slugBase = (name: string) => name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90).replace(/-+$/g, "") || "organization";

async function uniqueSlug(tx: typeof prisma, name: string): Promise<string> {
  const base = slugBase(name); let slug = base; let suffix = 2;
  while (await tx.organization.findUnique({ where: { slug }, select: { id: true } })) { slug = `${base.slice(0, 90 - String(suffix).length - 1)}-${suffix++}`; }
  return slug;
}

export async function listOrganizations(search = "", page = 1, limit = 10) {
  const safePage = Math.max(1, page), safeLimit = Math.min(100, Math.max(1, limit));
  const where = search ? { OR: [{ name: { contains: search, mode: "insensitive" as const } }, { slug: { contains: search, mode: "insensitive" as const } }] } : {};
  const [rows, total] = await prisma.$transaction([
    prisma.organization.findMany({ where, orderBy: { createdAt: "desc" }, skip: (safePage - 1) * safeLimit, take: safeLimit, select: { ...orgSelect, members: { where: { role: { code: "owner", scope: "organization" } }, take: 1, select: { user: { select: { id: true, name: true, email: true, isActive: true } }, role: { select: { id: true, name: true, code: true } } } } } }),
    prisma.organization.count({ where }),
  ]);
  return { data: rows.map(({ members, ...org }) => ({ ...org, owner: members[0] ? { ...members[0].user, role: members[0].role } : null })), pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) } };
}

export async function getOrganizationById(id: string) {
  const org = await prisma.organization.findUnique({ where: { id }, select: { ...orgSelect, members: { select: { createdAt: true, user: { select: { id: true, name: true, email: true, isActive: true } }, role: { select: { id: true, name: true, code: true } } } } } });
  if (!org) return null;
  const owner = org.members.find(m => m.role.code === "owner");
  return { ...org, owner: owner ? { ...owner.user, role: owner.role, joinedAt: owner.createdAt.toISOString() } : null, members: org.members.map(m => ({ ...m.user, role: m.role, joinedAt: m.createdAt.toISOString() })) };
}

export async function createOrganization(input: CreateOrganizationInput) {
  const name = input.name.trim(), ownerName = input.ownerName.trim(), ownerEmail = input.ownerEmail.trim().toLowerCase();
  const temporaryPassword = crypto.randomBytes(18).toString("base64url");
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);
  const created = await prisma.$transaction(async tx => {
    const slug = await uniqueSlug(tx as typeof prisma, name);
    const organization = await tx.organization.create({ data: { name, slug, address: input.address?.trim() || "", location: input.location?.trim() || "" } });
    let owner = await tx.user.findUnique({ where: { email: ownerEmail } });
    let newUser = false;
    if (!owner) { owner = await tx.user.create({ data: { name: ownerName, email: ownerEmail, passwordHash } }); newUser = true; }
    const ownerRole = await tx.role.upsert({
      where: { organizationId_code: { organizationId: organization.id, code: "owner" } },
      update: { name: "Owner", description: "Full control of this organization.", scope: "organization", isSystem: true, isActive: true },
      create: { organizationId: organization.id, name: "Owner", code: "owner", description: "Full control of this organization.", scope: "organization", isSystem: true, isActive: true },
    });
    const permissions = await tx.permission.findMany({ where: { scope: "organization" }, select: { id: true } });
    if (permissions.length) await tx.rolePermission.createMany({ data: permissions.map(permission => ({ roleId: ownerRole.id, permissionId: permission.id })), skipDuplicates: true });
    await tx.organizationMember.create({ data: { organizationId: organization.id, userId: owner.id, roleId: ownerRole.id } });
    return { organization, owner: { id: owner.id, name: owner.name, email: owner.email, isActive: owner.isActive }, newUser };
  });
  let emailSent = false;
  try { await sendOwnerWelcomeEmail({ name: created.owner.name, email: created.owner.email, organization: created.organization.name, slug: created.organization.slug, temporaryPassword: created.newUser ? temporaryPassword : null, existingUser: !created.newUser }); emailSent = true; }
  catch (error) { console.error("Owner email could not be sent:", error); }
  const { newUser, ...safe } = created;
  return { ...safe, emailSent };
}

export async function updateOrganization(id: string, input: UpdateOrganizationInput) {
  return prisma.organization.update({ where: { id }, data: { ...(input.name !== undefined && { name: input.name.trim() }), ...(input.address !== undefined && { address: input.address?.trim() || "" }), ...(input.location !== undefined && { location: input.location?.trim() || "" }), ...(input.isActive !== undefined && { isActive: input.isActive }) }, select: orgSelect });
}
export async function setOrganizationStatus(id: string, isActive: boolean) { return prisma.organization.update({ where: { id }, data: { isActive }, select: orgSelect }); }
