
import prisma from "../config/prisma.js";

export interface CreateDisciplineInput {
  name: string;
  code: string;
  description?: string | null;
}

export interface UpdateDisciplineInput {
  name?: string;
  code?: string;
  description?: string | null;
}

export interface ListDisciplinesOptions {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export class DisciplineService {
  async list(options: ListDisciplinesOptions = {}) {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 10));
    const skip = (page - 1) * limit;

    const search = options.search?.trim();

    const where = {
      ...(options.isActive !== undefined
        ? { isActive: options.isActive }
        : {}),
      ...(search
        ? {
            OR: [
              {
                name: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                code: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
    };

    const [data, total] = await prisma.$transaction([
      prisma.discipline.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      prisma.discipline.count({ where }),
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
    const discipline = await prisma.discipline.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            categories: true,
            catalogueItems: true,
          },
        },
      },
    });

    if (!discipline) {
      throw new Error("DISCIPLINE_NOT_FOUND");
    }

    return discipline;
  }

  async create(input: CreateDisciplineInput) {
    const name = input.name.trim();
    const code = input.code.trim().toUpperCase();

    if (!name || !code) {
      throw new Error("DISCIPLINE_NAME_AND_CODE_REQUIRED");
    }

    return prisma.discipline.create({
      data: {
        name,
        code,
        description: input.description?.trim() || null,
      },
    });
  }

  async update(id: number, input: UpdateDisciplineInput) {
    const existing = await prisma.discipline.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new Error("DISCIPLINE_NOT_FOUND");
    }

    const data = {
      ...(input.name !== undefined
        ? { name: input.name.trim() }
        : {}),
      ...(input.code !== undefined
        ? { code: input.code.trim().toUpperCase() }
        : {}),
      ...(input.description !== undefined
        ? { description: input.description?.trim() || null }
        : {}),
    };

    if (
      ("name" in data && !data.name) ||
      ("code" in data && !data.code)
    ) {
      throw new Error("DISCIPLINE_NAME_AND_CODE_REQUIRED");
    }

    return prisma.discipline.update({
      where: { id },
      data,
    });
  }

  async setStatus(id: number, isActive: boolean) {
    const existing = await prisma.discipline.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new Error("DISCIPLINE_NOT_FOUND");
    }

    return prisma.discipline.update({
      where: { id },
      data: { isActive },
    });
  }

  async delete(id:  number) {
    const discipline = await prisma.discipline.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            categories: true,
            catalogueItems: true,
          },
        },
      },
    });

    if (!discipline) {
      throw new Error("DISCIPLINE_NOT_FOUND");
    }

    if (
      discipline._count.categories > 0 ||
      discipline._count.catalogueItems > 0
    ) {
      throw new Error("DISCIPLINE_HAS_DEPENDENCIES");
    }

    await prisma.discipline.delete({
      where: { id },
    });

    return {
      id: discipline.id,
      deleted: true,
    };
  }
}

export const disciplineService = new DisciplineService();
