
import { Prisma } from "../../generated/prisma/client.js";
import prisma from "../config/prisma.js";

export interface CreateCatalogueItemInput {
    scope?: "platform" | "organization";
    organizationId?: number | null;
    disciplineId: number;
    categoryId: number;
    unitId: number;
    code?: string | null;
    name: string;
    description?: string | null;
    specification?: Prisma.InputJsonValue | null;
    defaultWastagePercent?: number | null;
}

export interface UpdateCatalogueItemInput {
    scope?: "platform" | "organization";
    organizationId?: number | null;
    disciplineId?: number;
    categoryId?: number;
    unitId?: number;
    code?: string | null;
    name?: string;
    description?: string | null;
    specification?: Prisma.InputJsonValue | null;
    defaultWastagePercent?: number | null;
}

export interface ListCatalogueItemsOptions {
    search?: string;
    scope?: "platform" | "organization";
    organizationId?: number;
    disciplineId?: number;
    categoryId?: number;
    unitId?: number;
    isActive?: boolean;
    page?: number;
    limit?: number;
}

const catalogueItemInclude = {
    discipline: {
        select: { id: true, name: true, code: true },
    },
    category: {
        select: { id: true, name: true, code: true },
    },
    unit: {
        select: { id: true, name: true, symbol: true, dimension: true },
    },
    organization: {
        select: { id: true },
    },
} satisfies Prisma.CatalogueItemInclude;

type CatalogueItemRecord = Prisma.CatalogueItemGetPayload<{
    include: typeof catalogueItemInclude;
}>;

function normalizeWastage(value: number | null | undefined) {
    if (value === undefined || value === null) {
        return value;
    }

    if (!Number.isFinite(value) || value < 0 || value > 100) {
        throw new Error("CATALOGUE_WASTAGE_INVALID");
    }

    return new Prisma.Decimal(value);
}

function validateOwnership(
    scope: "platform" | "organization",
    organizationId: number | null | undefined,
) {
    if (scope === "platform" && organizationId != null) {
        throw new Error("PLATFORM_ITEM_CANNOT_HAVE_ORGANIZATION");
    }

    if (scope === "organization" &&
        (!Number.isSafeInteger(organizationId) || (organizationId ?? 0) <= 0)) {
        throw new Error("ORGANIZATION_ITEM_REQUIRES_ORGANIZATION");
    }
}

async function validateReferences(
    disciplineId: number,
    categoryId: number,
    unitId: number,
) {
    const [discipline, category, unit] = await Promise.all([
        prisma.discipline.findUnique({
            where: { id: disciplineId },
            select: { id: true },
        }),
        prisma.category.findUnique({
            where: { id: categoryId },
            select: { id: true, disciplineId: true },
        }),
        prisma.unit.findUnique({
            where: { id: unitId },
            select: { id: true, isActive: true },
        }),
    ]);

    if (!discipline) {
        throw new Error("DISCIPLINE_NOT_FOUND");
    }

    if (!category) {
        throw new Error("CATEGORY_NOT_FOUND");
    }

    if (category.disciplineId !== disciplineId) {
        throw new Error("CATEGORY_DISCIPLINE_MISMATCH");
    }

    if (!unit) {
        throw new Error("UNIT_NOT_FOUND");
    }

    if (!unit.isActive) {
        throw new Error("UNIT_INACTIVE");
    }
}

function buildUpdateData(
    input: UpdateCatalogueItemInput,
): Prisma.CatalogueItemUncheckedUpdateInput {
    const data: Prisma.CatalogueItemUncheckedUpdateInput = {};

    if (input.scope !== undefined) data.scope = input.scope;
    if (input.organizationId !== undefined) {
        data.organizationId = input.organizationId;
    }
    if (input.disciplineId !== undefined) data.disciplineId = input.disciplineId;
    if (input.categoryId !== undefined) data.categoryId = input.categoryId;
    if (input.unitId !== undefined) data.unitId = input.unitId;
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.code !== undefined) data.code = input.code?.trim() || null;
    if (input.description !== undefined) {
        data.description = input.description?.trim() || null;
    }
    if (input.specification !== undefined) {
        data.specification =
            input.specification === null
                ? Prisma.JsonNull
                : input.specification;
    }
    if (input.defaultWastagePercent !== undefined) {
        data.defaultWastagePercent = normalizeWastage(
            input.defaultWastagePercent,
        ) ?? null;
    }

    return data;
}

export const catalogueItemService = {
    async list(options: ListCatalogueItemsOptions = {}) {
        const page = options.page ?? 1;
        const limit = options.limit ?? 10;

        if (
            !Number.isSafeInteger(page) ||
            page < 1 ||
            !Number.isSafeInteger(limit) ||
            limit < 1 ||
            limit > 100
        ) {
            throw new Error("PAGINATION_INVALID");
        }

        const where: Prisma.CatalogueItemWhereInput = {
            ...(options.search?.trim()
                ? {
                    OR: [
                        {
                            name: {
                                contains: options.search.trim(),
                                mode: "insensitive",
                            },
                        },
                        {
                            code: {
                                contains: options.search.trim(),
                                mode: "insensitive",
                            },
                        },
                        {
                            description: {
                                contains: options.search.trim(),
                                mode: "insensitive",
                            },
                        },
                    ],
                }
                : {}),
            ...(options.scope !== undefined ? { scope: options.scope } : {}),
            ...(options.organizationId !== undefined
                ? { organizationId: options.organizationId }
                : {}),
            ...(options.disciplineId !== undefined
                ? { disciplineId: options.disciplineId }
                : {}),
            ...(options.categoryId !== undefined
                ? { categoryId: options.categoryId }
                : {}),
            ...(options.unitId !== undefined ? { unitId: options.unitId } : {}),
            ...(options.isActive !== undefined
                ? { isActive: options.isActive }
                : {}),
        };

        const [data, total] = await prisma.$transaction([
            prisma.catalogueItem.findMany({
                where,
                include: catalogueItemInclude,
                orderBy: [{ name: "asc" }, { id: "asc" }],
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.catalogueItem.count({ where }),
        ]);

        return {
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    },

    async getById(id: number) {
        const item = await prisma.catalogueItem.findUnique({
            where: { id },
            include: catalogueItemInclude,
        });

        if (!item) {
            throw new Error("CATALOGUE_ITEM_NOT_FOUND");
        }

        return item;
    },

    async create(input: CreateCatalogueItemInput) {
        const name = input.name.trim();

        if (!name) {
            throw new Error("CATALOGUE_ITEM_NAME_REQUIRED");
        }

        const scope = input.scope ?? "platform";
        const organizationId = input.organizationId ?? null;

        validateOwnership(scope, organizationId);

        await validateReferences(
            input.disciplineId,
            input.categoryId,
            input.unitId,
        );

        const wastage = normalizeWastage(input.defaultWastagePercent);

        const data: Prisma.CatalogueItemUncheckedCreateInput = {
            scope,
            organizationId,
            disciplineId: input.disciplineId,
            categoryId: input.categoryId,
            unitId: input.unitId,
            name,
            code: input.code?.trim() || null,
            description: input.description?.trim() || null,
            ...(input.specification !== undefined
                ? {
                    specification:
                        input.specification === null
                            ? Prisma.JsonNull
                            : input.specification,
                }
                : {}),
            ...(wastage !== undefined
                ? { defaultWastagePercent: wastage }
                : {}),
        };

        const item = await prisma.catalogueItem.create({
            data,
            include: catalogueItemInclude,
        });

        return item;
    },

    async update(id: number, input: UpdateCatalogueItemInput) {
        const existing = await prisma.catalogueItem.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new Error("CATALOGUE_ITEM_NOT_FOUND");
        }

        const name = input.name?.trim();

        if (input.name !== undefined && !name) {
            throw new Error("CATALOGUE_ITEM_NAME_REQUIRED");
        }

        const scope = input.scope ?? existing.scope;
        const organizationId =
            input.organizationId !== undefined
                ? input.organizationId
                : existing.organizationId;

        validateOwnership(scope, organizationId);

        const disciplineId = input.disciplineId ?? existing.disciplineId;
        const categoryId = input.categoryId ?? existing.categoryId;
        const unitId = input.unitId ?? existing.unitId;

        await validateReferences(disciplineId, categoryId, unitId);

        const data = buildUpdateData(input);

        return prisma.catalogueItem.update({
            where: { id },
            data,
            include: catalogueItemInclude,
        });
    },

    async setStatus(id: number, isActive: boolean) {
        const existing = await prisma.catalogueItem.findUnique({
            where: { id },
            select: { id: true },
        });

        if (!existing) {
            throw new Error("CATALOGUE_ITEM_NOT_FOUND");
        }

        return prisma.catalogueItem.update({
            where: { id },
            data: { isActive },
            include: catalogueItemInclude,
        });
    },

    async delete(id: number) {
        const existing = await prisma.catalogueItem.findUnique({
            where: { id },
            select: { id: true },
        });

        if (!existing) {
            throw new Error("CATALOGUE_ITEM_NOT_FOUND");
        }

        await prisma.catalogueItem.delete({
            where: { id },
        });

        return { id };
    },
};
