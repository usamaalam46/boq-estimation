
import { Prisma } from "../../generated/prisma/client.js";
import prisma from "../config/prisma.js";

export interface CreateCategoryInput {
    disciplineId: number;
    parentId?: number | null;
    name: string;
    code?: string | null;
    description?: string | null;
    sortOrder?: number;
}

export interface UpdateCategoryInput {
    disciplineId?: number;
    parentId?: number | null;
    name?: string;
    code?: string | null;
    description?: string | null;
    sortOrder?: number;
}

export interface ListCategoriesOptions {
    search?: string;
    disciplineId?: number;
    parentId?: number | null;
    isActive?: boolean;
    page?: number;
    limit?: number;
}

export class CategoryService {
    async list(options: ListCategoriesOptions = {}) {
        const page = Math.max(1, options.page ?? 1);
        const limit = Math.min(100, Math.max(1, options.limit ?? 10));
        const skip = (page - 1) * limit;
        const search = options.search?.trim();

        const where: Prisma.CategoryWhereInput = {
            ...(options.disciplineId !== undefined
                ? { disciplineId: options.disciplineId }
                : {}),
            ...(options.parentId !== undefined
                ? { parentId: options.parentId }
                : {}),
            ...(options.isActive !== undefined
                ? { isActive: options.isActive }
                : {}),
            ...(search
                ? {
                    OR: [
                        { name: { contains: search, mode: "insensitive" } },
                        { code: { contains: search, mode: "insensitive" } },
                    ],
                }
                : {}),
        };

        const [data, total] = await prisma.$transaction([
            prisma.category.findMany({
                where,
                include: {
                    discipline: {
                        select: { id: true, name: true, code: true },
                    },
                    parent: {
                        select: { id: true, name: true, code: true },
                    },
                    _count: {
                        select: {
                            children: true,
                            catalogueItems: true,
                        },
                    },
                },
                orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
                skip,
                take: limit,
            }),
            prisma.category.count({ where }),
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
    }

    async getById(id: number) {
        const category = await prisma.category.findUnique({
            where: { id },
            include: {
                discipline: {
                    select: { id: true, name: true, code: true },
                },
                parent: {
                    select: { id: true, name: true, code: true },
                },
                children: {
                    select: { id: true, name: true, code: true, isActive: true },
                    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
                },
                _count: {
                    select: {
                        children: true,
                        catalogueItems: true,
                    },
                },
            },
        });

        if (!category) {
            throw new Error("CATEGORY_NOT_FOUND");
        }

        return category;
    }

    private async validateHierarchy(
        disciplineId: number,
        parentId: number | null | undefined,
        categoryId?: number
    ): Promise<void> {
        const discipline = await prisma.discipline.findUnique({
            where: { id: disciplineId },
            select: { id: true },
        });

        if (!discipline) {
            throw new Error("DISCIPLINE_NOT_FOUND");
        }

        if (parentId == null) {
            return;
        }

        if (categoryId !== undefined && parentId === categoryId) {
            throw new Error("CATEGORY_CANNOT_BE_OWN_PARENT");
        }

        const parent = await prisma.category.findUnique({
            where: { id: parentId },
            select: {
                id: true,
                disciplineId: true,
            },
        });

        if (!parent) {
            throw new Error("PARENT_CATEGORY_NOT_FOUND");
        }

        if (parent.disciplineId !== disciplineId) {
            throw new Error("CATEGORY_DISCIPLINE_MISMATCH");
        }

        // Prevent moving a category under one of its descendants.
        if (categoryId !== undefined) {
            let currentParentId: number | null = parent.id;
            const visited = new Set<number>();

            while (currentParentId !== null) {
                if (currentParentId === categoryId) {
                    throw new Error("CATEGORY_HIERARCHY_CYCLE");
                }

                if (visited.has(currentParentId)) {
                    throw new Error("CATEGORY_HIERARCHY_CYCLE");
                }

                visited.add(currentParentId);

                const currentParent: { parentId: number | null } | null =
                    await prisma.category.findUnique({
                        where: { id: currentParentId },
                        select: { parentId: true },
                    });

                currentParentId = currentParent?.parentId ?? null;

                currentParentId = currentParent?.parentId ?? null;
            }
        }
    }

    async create(input: CreateCategoryInput) {
        const name = input.name.trim();
        const code = input.code?.trim() || null;

        if (!name) {
            throw new Error("CATEGORY_NAME_REQUIRED");
        }

        if (
            input.sortOrder !== undefined &&
            (!Number.isInteger(input.sortOrder) || input.sortOrder < 0)
        ) {
            throw new Error("CATEGORY_SORT_ORDER_INVALID");
        }

        await this.validateHierarchy(input.disciplineId, input.parentId);

        return prisma.category.create({
            data: {
                disciplineId: input.disciplineId,
                parentId: input.parentId ?? null,
                name,
                code,
                description: input.description?.trim() || null,
                sortOrder: input.sortOrder ?? 0,
            },
            include: {
                discipline: {
                    select: { id: true, name: true, code: true },
                },
                parent: {
                    select: { id: true, name: true, code: true },
                },
            },
        });
    }

    async update(id: number, input: UpdateCategoryInput) {
        const existing = await prisma.category.findUnique({
            where: { id },
            select: {
                id: true,
                disciplineId: true,
                parentId: true,
            },
        });

        if (!existing) {
            throw new Error("CATEGORY_NOT_FOUND");
        }

        const name = input.name?.trim();
        const code = input.code?.trim() || null;

        if (input.name !== undefined && !name) {
            throw new Error("CATEGORY_NAME_REQUIRED");
        }

        if (
            input.sortOrder !== undefined &&
            (!Number.isInteger(input.sortOrder) || input.sortOrder < 0)
        ) {
            throw new Error("CATEGORY_SORT_ORDER_INVALID");
        }

        const disciplineId = input.disciplineId ?? existing.disciplineId;
        const parentId =
            input.parentId !== undefined ? input.parentId : existing.parentId;

        await this.validateHierarchy(disciplineId, parentId, id);

        // A category with children cannot be moved to another discipline
        // without also updating its descendants.
        if (
            disciplineId !== existing.disciplineId &&
            (await prisma.category.count({
                where: { parentId: id },
            })) > 0
        ) {
            throw new Error("CATEGORY_HAS_CHILDREN_CANNOT_MOVE_DISCIPLINE");
        }

        const data: Prisma.CategoryUncheckedUpdateInput = {
            ...(input.name !== undefined ? { name: name! } : {}),
            ...(input.code !== undefined ? { code } : {}),
            ...(input.description !== undefined
                ? { description: input.description?.trim() || null }
                : {}),
            ...(input.disciplineId !== undefined ? { disciplineId } : {}),
            ...(input.parentId !== undefined ? { parentId } : {}),
            ...(input.sortOrder !== undefined
                ? { sortOrder: input.sortOrder }
                : {}),
        };

        return prisma.category.update({
            where: { id },
            data,
            include: {
                discipline: {
                    select: { id: true, name: true, code: true },
                },
                parent: {
                    select: { id: true, name: true, code: true },
                },
            },
        });
    }

    async setStatus(id: number, isActive: boolean) {
        const existing = await prisma.category.findUnique({
            where: { id },
            select: { id: true },
        });

        if (!existing) {
            throw new Error("CATEGORY_NOT_FOUND");
        }

        return prisma.category.update({
            where: { id },
            data: { isActive },
        });
    }

    async delete(id: number) {
        const category = await prisma.category.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        children: true,
                        catalogueItems: true,
                    },
                },
            },
        });

        if (!category) {
            throw new Error("CATEGORY_NOT_FOUND");
        }

        if (category._count.children > 0) {
            throw new Error("CATEGORY_HAS_CHILDREN");
        }

        if (category._count.catalogueItems > 0) {
            throw new Error("CATEGORY_HAS_CATALOGUE_ITEMS");
        }

        await prisma.category.delete({
            where: { id },
        });

        return {
            id: category.id,
            deleted: true,
        };
    }
}

export const categoryService = new CategoryService();
