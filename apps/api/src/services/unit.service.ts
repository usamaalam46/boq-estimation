
import { Prisma } from "../../generated/prisma/client.js";
import prisma from "../config/prisma.js";

export interface CreateUnitInput {
    name: string;
    symbol: string;
    description?: string | null;
    dimension?: string | null;
}

export interface UpdateUnitInput {
    name?: string;
    symbol?: string;
    description?: string | null;
    dimension?: string | null;
}

export interface ListUnitsOptions {
    search?: string;
    dimension?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
}

export const unitService = {
    async list(options: ListUnitsOptions = {}) {
        const page = options.page ?? 1;
        const limit = options.limit ?? 10;
        const skip = (page - 1) * limit;

        const where: Prisma.UnitWhereInput = {
            ...(options.search
                ? {
                    OR: [
                        { name: { contains: options.search, mode: "insensitive" } },
                        { symbol: { contains: options.search, mode: "insensitive" } },
                        {
                            description: {
                                contains: options.search,
                                mode: "insensitive",
                            },
                        },
                    ],
                }
                : {}),
            ...(options.dimension !== undefined
                ? { dimension: options.dimension }
                : {}),
            ...(options.isActive !== undefined
                ? { isActive: options.isActive }
                : {}),
        };

        const [data, total] = await prisma.$transaction([
            prisma.unit.findMany({
                where,
                orderBy: [{ name: "asc" }],
                skip,
                take: limit,
                include: {
                    _count: {
                        select: {
                            catalogueItems: true,
                            estimateItems: true,
                        },
                    },
                },
            }),
            prisma.unit.count({ where }),
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
        const unit = await prisma.unit.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        catalogueItems: true,
                        estimateItems: true,
                    },
                },
            },
        });

        if (!unit) {
            throw new Error("UNIT_NOT_FOUND");
        }

        return unit;
    },

    async create(input: CreateUnitInput) {
        const name = input.name.trim();
        const symbol = input.symbol.trim();

        if (!name) {
            throw new Error("UNIT_NAME_REQUIRED");
        }

        if (!symbol) {
            throw new Error("UNIT_SYMBOL_REQUIRED");
        }

        return prisma.unit.create({
            data: {
                name,
                symbol,
                description: input.description?.trim() || null,
                dimension: input.dimension?.trim() || null,
            },
        });
    },

    async update(id: number, input: UpdateUnitInput) {
        const existing = await prisma.unit.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new Error("UNIT_NOT_FOUND");
        }

        if (input.name !== undefined && !input.name.trim()) {
            throw new Error("UNIT_NAME_REQUIRED");
        }

        if (input.symbol !== undefined && !input.symbol.trim()) {
            throw new Error("UNIT_SYMBOL_REQUIRED");
        }

        const data: Prisma.UnitUpdateInput = {
            ...(input.name !== undefined ? { name: input.name.trim() } : {}),
            ...(input.symbol !== undefined ? { symbol: input.symbol.trim() } : {}),
            ...(input.description !== undefined
                ? { description: input.description?.trim() || null }
                : {}),
            ...(input.dimension !== undefined
                ? { dimension: input.dimension?.trim() || null }
                : {}),
        };

        return prisma.unit.update({
            where: { id },
            data,
        });
    },

    async setStatus(id: number, isActive: boolean) {
        const existing = await prisma.unit.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new Error("UNIT_NOT_FOUND");
        }

        return prisma.unit.update({
            where: { id },
            data: { isActive },
        });
    },

    async delete(id: number) {
        const existing = await prisma.unit.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        catalogueItems: true,
                        estimateItems: true,
                    },
                },
            },
        });

        if (!existing) {
            throw new Error("UNIT_NOT_FOUND");
        }

        if (
            existing._count.catalogueItems > 0 ||
            existing._count.estimateItems > 0
        ) {
            throw new Error("UNIT_IN_USE");
        }

        await prisma.unit.delete({
            where: { id },
        });

        return { id };
    },
};
