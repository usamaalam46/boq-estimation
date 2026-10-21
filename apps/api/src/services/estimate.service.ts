import type { PrismaClient } from "../../generated/prisma/client.js";
import {
  calculateEstimate,
  calculateItem,
} from "../controllers/estimate.calculation.js";
import type { CreateEstimateInput } from "../validators/estimate.validatior.js";

const httpError = (message: string, status: number) =>
  Object.assign(new Error(message), { status });
const asDecimal = (value: number) => value.toFixed(4);
const asMoney = (value: number) => value.toFixed(2);

export class EstimatesService {
  constructor(private readonly prisma: PrismaClient) { }

  private async assertProjectAccess(userId: number, projectId: number) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        organizationId: true,
        organization: { select: { isActive: true } },
      },
    });
    if (!project || !project.organization.isActive)
      throw httpError("Project not found or unavailable.", 404);
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: project.organizationId,
          userId,
        },
      },
      select: {
        id: true,
        role: {
          select: {
            isActive: true,
            rolePermissions: {
              select: { permission: { select: { code: true } } },
            },
          },
        },
      },
    });
    if (!membership || !membership.role.isActive)
      throw httpError(
        "You do not have access to this project's organization.",
        403
      );
    return { project, membership };
  }

  private async assertEstimateAccess(userId: number, estimateId: number) {
    const estimate = await this.prisma.estimate.findUnique({
      where: { id: estimateId },
      select: {
        id: true,
        status: true,
        projectId: true,
        project: {
          select: {
            organizationId: true,
            organization: { select: { isActive: true } },
          },
        },
      },
    });
    if (!estimate || !estimate.project.organization.isActive)
      throw httpError("Estimate not found.", 404);
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: estimate.project.organizationId,
          userId,
        },
      },
      select: {
        id: true,
        role: {
          select: {
            isActive: true,
            rolePermissions: {
              select: { permission: { select: { code: true } } },
            },
          },
        },
      },
    });
    if (!membership || !membership.role.isActive)
      throw httpError("You do not have access to this estimate.", 403);
    return { estimate, membership };
  }

  private hasPermission(
    membership: {
      role: { rolePermissions: { permission: { code: string } }[] };
    },
    ...codes: string[]
  ) {
    const granted = new Set(
      membership.role.rolePermissions.map((rp) => rp.permission.code)
    );
    return codes.some(
      (code) =>
        granted.has(code) || granted.has("*") || granted.has("estimates.manage")
    );
  }

  async list(
    userId: number,
    params: {
      page: number;
      pageSize: number;
      search: string;
      status?: string;
      projectId?: number;
    }
  ) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: {
        userId,
        role: {
          isActive: true,
          rolePermissions: { some: { permission: { code: "estimates.view" } } },
        },
        organization: { isActive: true },
      },
      select: { organizationId: true },
    });
    const organizationIds = [
      ...new Set(memberships.map((m) => m.organizationId)),
    ];
    const where = {
      project: {
        organizationId: { in: organizationIds },
        organization: { isActive: true },
        ...(params.projectId ? { id: params.projectId } : {}),
      },
      ...(params.status
        ? {
          status: params.status as
            "draft" | "in_review" | "approved" | "archived",
        }
        : {}),
      ...(params.search
        ? {
          OR: [
            {
              name: { contains: params.search, mode: "insensitive" as const },
            },
            {
              reference: {
                contains: params.search,
                mode: "insensitive" as const,
              },
            },
          ],
        }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.estimate.findMany({
        where,
        include: {
          project: {
            select: {
              id: true,
              name: true,
              code: true,
              organization: { select: { id: true, name: true, slug: true } },
            },
          },
          createdBy: { select: { id: true, name: true, email: true } },
          _count: { select: { sections: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.estimate.count({ where }),
    ]);
    return {
      items,
      pagination: {
        page: params.page,
        limit: params.pageSize,
        total,
        totalPages: Math.ceil(total / params.pageSize),
      },
    };
  }

  async get(userId: number, id: number) {
    const { membership } = await this.assertEstimateAccess(userId, id);
    if (!this.hasPermission(membership, "estimates.view", "estimates.manage"))
      throw httpError("Your role cannot view estimates.", 403);
    return this.prisma.estimate.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, name: true, code: true, organizationId: true },
        },
        createdBy: { select: { id: true, name: true, email: true } },
        sections: {
          orderBy: { sortOrder: "asc" },
          include: {
            items: {
              orderBy: { sortOrder: "asc" },
              include: {
                unit: { select: { id: true, name: true, symbol: true } },
                catalogueItem: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    description: true,
                    specification: true,
                    defaultWastagePercent: true,
                    unit: { select: { id: true, name: true, symbol: true } },
                    category: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async create(userId: number, input: CreateEstimateInput) {
    const { membership } = await this.assertProjectAccess(
      userId,
      input.projectId
    );
    if (!this.hasPermission(membership, "estimates.create", "estimates.manage"))
      throw httpError("Your role cannot create estimates.", 403);
    const allItems = input.sections.flatMap((section) => section.items);
    const unitSymbols = [
      ...new Set(
        allItems.filter((item) => !item.unitId).map((item) => item.unitSymbol)
      ),
    ];
    const units = await this.prisma.unit.findMany({
      where: { symbol: { in: unitSymbols }, isActive: true },
      select: { id: true, symbol: true },
    });
    const unitBySymbol = new Map(
      units.map((unit) => [unit.symbol.toLowerCase(), unit.id])
    );
    for (const item of allItems) {
      if (item.unitId) {
        const unit = await this.prisma.unit.findFirst({
          where: { id: item.unitId, isActive: true },
          select: { id: true, symbol: true },
        });
        if (!unit)
          throw httpError(
            `Unit ${item.unitId} is not active or does not exist.`,
            422
          );
        item.unitSymbol = unit.symbol;
      } else {
        const unitId = unitBySymbol.get(item.unitSymbol.toLowerCase());
        if (!unitId)
          throw httpError(
            `Unit '${item.unitSymbol}' was not found. Select a valid unit or send unitId.`,
            422
          );
        item.unitId = unitId;
      }
      if (item.catalogueItemId) {
        const catalogueItem = await this.prisma.catalogueItem.findFirst({
          where: {
            id: item.catalogueItemId,
            isActive: true,
            OR: [
              { scope: "platform", organizationId: null },
              {
                scope: "organization",
                organizationId: (
                  await this.prisma.project.findUniqueOrThrow({
                    where: { id: input.projectId },
                    select: { organizationId: true },
                  })
                ).organizationId,
              },
            ],
          },
          select: { id: true },
        });
        if (!catalogueItem)
          throw httpError(
            `Catalogue item ${item.catalogueItemId} is not available to this organization.`,
            422
          );
      }
    }
    const calculated = calculateEstimate(
      allItems,
      input.contingencyPercent ?? 0,
      input.taxPercent ?? 0
    );
    return this.prisma.$transaction(async (tx) =>
      tx.estimate.create({
        data: {
          projectId: input.projectId,
          createdById: userId,
          name: input.name,
          reference: input.reference,
          description: input.description,
          currency: input.currency ?? "PKR",
          status: "draft",
          contingencyPercent: asDecimal(input.contingencyPercent ?? 0),
          taxPercent: asDecimal(input.taxPercent ?? 0),
          subtotal: asMoney(calculated.subtotal),
          wastageTotal: asMoney(calculated.wastageTotal),
          contingencyAmount: asMoney(calculated.contingencyAmount),
          taxAmount: asMoney(calculated.taxAmount),
          grandTotal: asMoney(calculated.grandTotal),
          sections: {
            create: input.sections.map((section) => ({
              name: section.name,
              description: section.description,
              sortOrder: section.sortOrder,
              items: {
                create: section.items.map((item) => ({
                  catalogueItemId: item.catalogueItemId ?? null,
                  unitId: item.unitId!,
                  itemCode: item.itemCode,
                  description: item.description,
                  specification: item.specification as any,
                  unitSymbol: item.unitSymbol,
                  quantity: asDecimal(item.quantity),
                  rate: asDecimal(item.rate),
                  wastagePercent: asDecimal(item.wastagePercent ?? 0),
                  amount: asMoney(calculateItem(item).amount),
                  remarks: item.remarks,
                  sortOrder: item.sortOrder,
                })),
              },
            })),
          },
        },
        include: {
          sections: {
            orderBy: { sortOrder: "asc" },
            include: { items: { orderBy: { sortOrder: "asc" } } },
          },
          project: { select: { id: true, name: true, code: true } },
        },
      })
    );
  }

  async updateDraft(userId: number, id: number, input: CreateEstimateInput) {
    const { estimate, membership } = await this.assertEstimateAccess(
      userId,
      id
    );
    if (!this.hasPermission(membership, "estimates.edit", "estimates.manage"))
      throw httpError("Your role cannot edit estimates.", 403);

    // Status transitions require the corresponding permission; editing BOQ details still
    // requires estimates.edit. This prevents a user from approving without approval rights.
    const nextStatus = input.status ?? estimate.status;
    if (nextStatus !== estimate.status) {
      if (
        nextStatus === "in_review" &&
        !this.hasPermission(membership, "estimates.submit", "estimates.manage")
      ) {
        throw httpError("Your role cannot submit estimates for review.", 403);
      }
      if (
        (nextStatus === "approved" || nextStatus === "archived") &&
        !this.hasPermission(membership, "estimates.approve", "estimates.manage")
      ) {
        throw httpError("Your role cannot approve or archive estimates.", 403);
      }
    }
    await this.assertProjectAccess(userId, input.projectId);

    const allItems = input.sections.flatMap((section) => section.items);
    const unitSymbols = [
      ...new Set(
        allItems.filter((item) => !item.unitId).map((item) => item.unitSymbol)
      ),
    ];
    const units = await this.prisma.unit.findMany({
      where: { symbol: { in: unitSymbols }, isActive: true },
      select: { id: true, symbol: true },
    });
    const unitBySymbol = new Map(
      units.map((unit) => [unit.symbol.toLowerCase(), unit.id])
    );
    for (const item of allItems) {
      if (item.unitId) {
        const unit = await this.prisma.unit.findFirst({
          where: { id: item.unitId, isActive: true },
          select: { id: true, symbol: true },
        });
        if (!unit) throw httpError(`Unit ${item.unitId} was not found.`, 422);
        item.unitSymbol = unit.symbol;
      } else {
        const unitId = unitBySymbol.get(item.unitSymbol.toLowerCase());
        if (!unitId)
          throw httpError(`Unit '${item.unitSymbol}' was not found.`, 422);
        item.unitId = unitId;
      }
      if (item.catalogueItemId) {
        const project = await this.prisma.project.findUniqueOrThrow({
          where: { id: input.projectId },
          select: { organizationId: true },
        });
        const catalogueItem = await this.prisma.catalogueItem.findFirst({
          where: {
            id: item.catalogueItemId,
            isActive: true,
            OR: [
              { scope: "platform", organizationId: null },
              { scope: "organization", organizationId: project.organizationId },
            ],
          },
          select: { id: true },
        });
        if (!catalogueItem)
          throw httpError(
            `Catalogue item ${item.catalogueItemId} is not available to this organization.`,
            422
          );
      }
    }

    const totals = calculateEstimate(
      allItems,
      input.contingencyPercent ?? 0,
      input.taxPercent ?? 0
    );
    return this.prisma.$transaction(async (tx) => {
      // Replace the estimate's existing section/item tree exactly once per save.
      // This avoids appending the submitted items to the existing rows.
      await tx.estimateSection.deleteMany({ where: { estimateId: id } });
      return tx.estimate.update({
        where: { id },
        data: {
          projectId: input.projectId,
          name: input.name,
          reference: input.reference,
          description: input.description,
          currency: input.currency ?? "PKR",
          status: nextStatus,
          contingencyPercent: asDecimal(input.contingencyPercent ?? 0),
          taxPercent: asDecimal(input.taxPercent ?? 0),
          subtotal: asMoney(totals.subtotal),
          wastageTotal: asMoney(totals.wastageTotal),
          contingencyAmount: asMoney(totals.contingencyAmount),
          taxAmount: asMoney(totals.taxAmount),
          grandTotal: asMoney(totals.grandTotal),
          sections: {
            create: input.sections.map((section) => ({
              name: section.name,
              description: section.description,
              sortOrder: section.sortOrder,
              items: {
                create: section.items.map((item) => ({
                  catalogueItemId: item.catalogueItemId ?? null,
                  unitId: item.unitId!,
                  itemCode: item.itemCode,
                  description: item.description,
                  specification: item.specification as any,
                  unitSymbol: item.unitSymbol,
                  quantity: asDecimal(item.quantity),
                  rate: asDecimal(item.rate),
                  wastagePercent: asDecimal(item.wastagePercent ?? 0),
                  amount: asMoney(calculateItem(item).amount),
                  remarks: item.remarks,
                  sortOrder: item.sortOrder,
                })),
              },
            })),
          },
        },
        include: {
          sections: {
            orderBy: { sortOrder: "asc" },
            include: { items: { orderBy: { sortOrder: "asc" } } },
          },
        },
      });
    });
  }

  async remove(userId: number, id: number) {
    const { estimate, membership } = await this.assertEstimateAccess(
      userId,
      id
    );
    if (estimate.status !== "draft")
      throw httpError("Only draft estimates can be deleted.", 409);
    if (!this.hasPermission(membership, "estimates.delete", "estimates.manage"))
      throw httpError("Your role cannot delete estimates.", 403);
    await this.prisma.estimate.delete({ where: { id } });
    return { id };
  }

  async duplicate(userId: number, id: number) {
    const { estimate, membership } = await this.assertEstimateAccess(
      userId,
      id
    );
    if (!this.hasPermission(membership, "estimates.create", "estimates.manage"))
      throw httpError("Your role cannot create estimates.", 403);
    const source = await this.get(userId, id);
    if (!source) throw httpError("Estimate not found.", 404);
    return this.prisma.$transaction(async (tx) =>
      tx.estimate.create({
        data: {
          projectId: source.projectId,
          createdById: userId,
          name: `${source.name} (Copy)`,
          reference: null,
          description: source.description,
          currency: source.currency,
          status: "draft",
          contingencyPercent: source.contingencyPercent,
          taxPercent: source.taxPercent,
          subtotal: source.subtotal,
          wastageTotal: source.wastageTotal,
          contingencyAmount: source.contingencyAmount,
          taxAmount: source.taxAmount,
          grandTotal: source.grandTotal,
          sections: {
            create: source.sections.map((section) => ({
              name: section.name,
              description: section.description,
              sortOrder: section.sortOrder,
              items: {
                create: section.items.map((item) => ({
                  catalogueItemId: item.catalogueItemId,
                  unitId: item.unitId,
                  itemCode: item.itemCode,
                  description: item.description,
                  specification: item.specification ?? undefined,
                  unitSymbol: item.unitSymbol,
                  quantity: item.quantity,
                  rate: item.rate,
                  wastagePercent: item.wastagePercent,
                  amount: item.amount,
                  remarks: item.remarks,
                  sortOrder: item.sortOrder,
                })),
              },
            })),
          },
        },
        include: { sections: { include: { items: true } } },
      })
    );
  }
}
