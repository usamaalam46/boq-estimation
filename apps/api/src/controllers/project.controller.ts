import type { Request, Response, NextFunction } from "express";
import { ProjectsService } from "../services/project.service.js";
import prisma from "../config/prisma.js";

const projectsService = new ProjectsService(prisma);

export class ProjectsController {
  /**
   * GET /api/projects
   * Get projects for the authenticated user.
   */
  static async index(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.auth?.userId;

      if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(401).json({
          success: false,
          message: "Unauthenticated.",
        });
      }

      const search =
        typeof req.query.search === "string" ? req.query.search : "";

      const page = Math.max(1, Number(req.query.page) || 1);

      const pageSize = Math.min(
        100,
        Math.max(1, Number(req.query.pageSize) || 10)
      );

      const result = await projectsService.list(userId, search, page, pageSize);

      return res.status(200).json({
        success: true,
        message: "Projects retrieved successfully.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/projects
   * Create a project.
   */
  static async store(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.auth?.userId;

      if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(401).json({
          success: false,
          message: "Unauthenticated.",
        });
      }

      const { organizationId, name, code, description } = req.body;

      if (typeof name !== "string" || !name.trim()) {
        return res.status(422).json({
          success: false,
          message: "Project name is required.",
        });
      }

      if (
        organizationId !== undefined &&
        (!Number.isInteger(Number(organizationId)) ||
          Number(organizationId) <= 0)
      ) {
        return res.status(422).json({
          success: false,
          message: "Invalid organization ID.",
        });
      }

      const project = await projectsService.create(userId, {
        organizationId:
          organizationId === undefined ? undefined : Number(organizationId),
        name: name.trim(),
        code: typeof code === "string" ? code.trim() || null : null,
        description:
          typeof description === "string" ? description.trim() || null : null,
      });

      return res.status(201).json({
        success: true,
        message: "Project created successfully.",
        data: project,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/projects/:id
   * Update a project.
   */
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.auth?.userId;
      const projectId = Number(req.params.id);

      if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(401).json({
          success: false,
          message: "Unauthenticated.",
        });
      }

      if (!Number.isInteger(projectId) || projectId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid project ID.",
        });
      }

      const { name, code, description } = req.body;

      if (name !== undefined && (typeof name !== "string" || !name.trim())) {
        return res.status(422).json({
          success: false,
          message: "Project name must not be empty.",
        });
      }

      const project = await projectsService.update(userId, projectId, {
        ...(name !== undefined && {
          name: name.trim(),
        }),
        ...(code !== undefined && {
          code: typeof code === "string" ? code.trim() || null : null,
        }),
        ...(description !== undefined && {
          description:
            typeof description === "string" ? description.trim() || null : null,
        }),
      });

      return res.status(200).json({
        success: true,
        message: "Project updated successfully.",
        data: project,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/projects/:id
   * Delete a project.
   */
  static async destroy(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.auth?.userId;
      const projectId = Number(req.params.id);

      if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(401).json({
          success: false,
          message: "Unauthenticated.",
        });
      }

      if (!Number.isInteger(projectId) || projectId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid project ID.",
        });
      }

      const result = await projectsService.remove(userId, projectId);

      return res.status(200).json({
        success: true,
        message: "Project deleted successfully.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
