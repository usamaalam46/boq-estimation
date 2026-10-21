import type { PrismaClient } from "../../generated/prisma/client.js";

export class ProjectsService {
  constructor(private readonly prisma: PrismaClient) { }

  /**
   * Get organization IDs belonging to the authenticated user.
   */
  private async getOrganizationIds(userId: number): Promise<number[]> {
    const memberships = await this.prisma.organizationMember.findMany({
      where: {
        userId,
        organization: {
          isActive: true,
        },
      },
      select: {
        organizationId: true,
      },
    });

    return memberships.map((membership) => membership.organizationId);
  }

  /**
   * Ensure the user belongs to the requested organization.
   */
  private async assertMember(
    userId: number,
    organizationId: number,
  ): Promise<void> {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
      select: {
        id: true,
        organization: {
          select: {
            isActive: true,
          },
        },
      },
    });

    if (!membership || !membership.organization.isActive) {
      throw Object.assign(
        new Error("You do not have access to this organization."),
        { status: 403 },
      );
    }
  }

  /**
   * List projects from all active organizations the user belongs to.
   */
  async list(userId: number, search = "", page = 1, pageSize = 10) {
    const organizationIds = await this.getOrganizationIds(userId);

    const currentPage = Math.max(1, Math.floor(page));
    const limit = Math.min(100, Math.max(1, Math.floor(pageSize)));
    const searchTerm = search.trim();

    const where = {
      organizationId: {
        in: organizationIds,
      },
      ...(searchTerm
        ? {
          OR: [
            {
              name: {
                contains: searchTerm,
                mode: "insensitive" as const,
              },
            },
            {
              code: {
                contains: searchTerm,
                mode: "insensitive" as const,
              },
            },
          ],
        }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where,
        orderBy: {
          updatedAt: "desc",
        },
        skip: (currentPage - 1) * limit,
        take: limit,
        select: {
          id: true,
          organizationId: true,
          name: true,
          code: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              estimates: true,
            },
          },
        },
      }),

      this.prisma.project.count({ where }),
    ]);

    return {
      items,
      total,
      page: currentPage,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Create a project in the user's organization.
   */
  async create(
    userId: number,
    input: {
      organizationId?: number;
      name: string;
      code?: string | null;
      description?: string | null;
    },
  ) {
    const name = input.name.trim();

    if (!name) {
      throw Object.assign(new Error("Project name is required."), {
        status: 400,
      });
    }

    let organizationId = input.organizationId;

    if (organizationId !== undefined) {
      await this.assertMember(userId, organizationId);
    } else {
      const organizationIds = await this.getOrganizationIds(userId);

      if (organizationIds.length === 0) {
        throw Object.assign(
          new Error("No active organization found for this user."),
          { status: 403 },
        );
      }

      if (organizationIds.length > 1) {
        throw Object.assign(new Error("Please select an organization first."), {
          status: 400,
        });
      }

      organizationId = organizationIds[0];
    }
    if (organizationId === undefined) {
      throw Object.assign(
        new Error("Organization ID is required."),
        { status: 400 }
      );
    }
    return this.prisma.project.create({
      data: {
        organizationId,
        name,
        code: input.code?.trim() || null,
        description: input.description?.trim() || null,
      },
      select: {
        id: true,
        organizationId: true,
        name: true,
        code: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            estimates: true,
          },
        },
      },
    });
  }

  /**
   * Update a project only if the user belongs to its organization.
   */
  async update(
    userId: number,
    id: number,
    input: {
      name?: string;
      code?: string | null;
      description?: string | null;
    },
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        organizationId: true,
      },
    });

    if (!project) {
      throw Object.assign(new Error("Project not found."), { status: 404 });
    }

    await this.assertMember(userId, project.organizationId);

    if (input.name !== undefined && !input.name.trim()) {
      throw Object.assign(new Error("Project name cannot be empty."), {
        status: 400,
      });
    }

    return this.prisma.project.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.code !== undefined
          ? { code: input.code?.trim() || null }
          : {}),
        ...(input.description !== undefined
          ? { description: input.description?.trim() || null }
          : {}),
      },
      select: {
        id: true,
        organizationId: true,
        name: true,
        code: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            estimates: true,
          },
        },
      },
    });
  }

  /**
   * Delete a project only if it has no estimates.
   */
  async remove(userId: number, id: number): Promise<{ id: number }> {
    const project = await this.prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        organizationId: true,
      },
    });

    if (!project) {
      throw Object.assign(new Error("Project not found."), { status: 404 });
    }

    await this.assertMember(userId, project.organizationId);

    const estimateCount = await this.prisma.estimate.count({
      where: {
        projectId: id,
      },
    });

    if (estimateCount > 0) {
      throw Object.assign(
        new Error("This project has estimates and cannot be deleted."),
        { status: 409 },
      );
    }

    await this.prisma.project.delete({
      where: { id },
    });

    return { id };
  }
}
