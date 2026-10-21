import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import prisma from "../config/prisma.js";

export async function indexCatalogueItems(req: AuthenticatedRequest, res: Response) {
  const userId = req.auth?.userId;
  if (!userId) return res.status(401).json({ success: false, message: "Authentication required." });

  try {
    const page = Math.max(1, Number.parseInt(String(req.query.page ?? 1), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit ?? req.query.pageSize ?? 100), 10) || 100));
    const search = String(req.query.search ?? "").trim().slice(0, 100);

    const memberships = await prisma.organizationMember.findMany({
      where: { userId, organization: { isActive: true } },
      select: { organizationId: true },
    });
    const organizationIds = memberships.map((membership) => membership.organizationId);
    const where = {
      isActive: true,
      OR: [
        { scope: "platform" as const, organizationId: null },
        ...(organizationIds.length ? [{ scope: "organization" as const, organizationId: { in: organizationIds } }] : []),
      ],
      ...(search ? {
        OR: [
          { scope: "platform" as const, organizationId: null },
          ...(organizationIds.length ? [{ scope: "organization" as const, organizationId: { in: organizationIds } }] : []),
        ].length ? {
          AND: [{
            OR: [
              { scope: "platform" as const, organizationId: null },
              ...(organizationIds.length ? [{ scope: "organization" as const, organizationId: { in: organizationIds } }] : []),
            ]
          }, {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { code: { contains: search, mode: "insensitive" as const } },
              { description: { contains: search, mode: "insensitive" as const } },
              { category: { name: { contains: search, mode: "insensitive" as const } } },
              { discipline: { name: { contains: search, mode: "insensitive" as const } } },
            ]
          }],
        } : {}
      } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.catalogueItem.findMany({
        where,
        include: {
          unit: { select: { id: true, name: true, symbol: true } },
          category: { select: { id: true, name: true, discipline: { select: { name: true } } } },
          discipline: { select: { id: true, name: true, code: true } },
        },
        orderBy: [{ name: "asc" }, { id: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.catalogueItem.count({ where }),
    ]);

    return res.json({
      success: true,
      message: "Catalogue items retrieved successfully.",
      data: items,
      pagination: { page, limit: pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    console.error("Catalogue item list error:", error);
    return res.status(500).json({ success: false, message: "Unable to retrieve catalogue items." });
  }
}
