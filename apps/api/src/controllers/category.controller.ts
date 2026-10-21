
import type { Request, Response } from "express";
import { Prisma } from "../../generated/prisma/client.js";
import { categoryService } from "../services/category.service.js";

function parsePositiveInt(value: unknown): number | null {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const parsed = Number(value);

  return Number.isSafeInteger(parsed) ? parsed : null;
}

function parseBoolean(value: unknown): boolean | undefined | null {
  if (value === undefined) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;

  return null;
}

function sendError(res: Response, error: unknown): Response {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return res.status(409).json({
        message: "A category with these details already exists.",
      });
    }

    if (error.code === "P2003") {
      return res.status(409).json({
        message: "This category is referenced by another record.",
      });
    }
  }

  const message =
    error instanceof Error ? error.message : "An unexpected error occurred.";

  const notFoundErrors: Record<string, string> = {
    CATEGORY_NOT_FOUND: "Category not found.",
    DISCIPLINE_NOT_FOUND: "Discipline not found.",
    PARENT_CATEGORY_NOT_FOUND: "Parent category not found.",
  };

  if (notFoundErrors[message]) {
    return res.status(404).json({ message: notFoundErrors[message] });
  }

  const conflictErrors: Record<string, string> = {
    CATEGORY_HAS_CHILDREN: "This category has child categories.",
    CATEGORY_HAS_CATALOGUE_ITEMS:
      "This category contains catalogue items.",
    CATEGORY_HAS_CHILDREN_CANNOT_MOVE_DISCIPLINE:
      "A category with child categories cannot be moved to another discipline.",
  };

  if (conflictErrors[message]) {
    return res.status(409).json({ message: conflictErrors[message] });
  }

  const validationErrors: Record<string, string> = {
    CATEGORY_NAME_REQUIRED: "Category name is required.",
    CATEGORY_SORT_ORDER_INVALID:
      "Sort order must be a non-negative integer.",
    CATEGORY_CANNOT_BE_OWN_PARENT:
      "A category cannot be its own parent.",
    CATEGORY_DISCIPLINE_MISMATCH:
      "The parent category must belong to the same discipline.",
    CATEGORY_HIERARCHY_CYCLE:
      "This parent selection would create a category hierarchy cycle.",
  };

  if (validationErrors[message]) {
    return res.status(400).json({ message: validationErrors[message] });
  }

  console.error("Category controller error:", error);

  return res.status(500).json({
    message: "An unexpected error occurred.",
  });
}

export const categoryController = {
  async index(req: Request, res: Response): Promise<Response> {
    try {
      const page = req.query.page === undefined
        ? 1
        : parsePositiveInt(req.query.page);

      const limit = req.query.limit === undefined
        ? 10
        : parsePositiveInt(req.query.limit);

      const disciplineId =
        req.query.disciplineId === undefined
          ? undefined
          : parsePositiveInt(req.query.disciplineId);

      const parentId =
        req.query.parentId === undefined
          ? undefined
          : req.query.parentId === "null"
            ? null
            : parsePositiveInt(req.query.parentId);

      const isActive = parseBoolean(req.query.isActive);

      if (page === null || limit === null || limit > 100) {
        return res.status(400).json({
          message: "Page must be positive and limit must be between 1 and 100.",
        });
      }

      if (disciplineId === null) {
        return res.status(400).json({
          message: "disciplineId must be a positive integer.",
        });
      }

      if (req.query.parentId !== undefined && parentId === null &&
          req.query.parentId !== "null") {
        return res.status(400).json({
          message: 'parentId must be a positive integer or "null".',
        });
      }

      if (isActive === null) {
        return res.status(400).json({
          message: 'isActive must be "true" or "false".',
        });
      }

      const search =
        typeof req.query.search === "string"
          ? req.query.search.trim()
          : undefined;

      const result = await categoryService.list({
        ...(search !== undefined ? { search } : {}),
        ...(disciplineId !== undefined ? { disciplineId } : {}),
        ...(parentId !== undefined ? { parentId } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        page,
        limit,
      });

      return res.status(200).json({
        message: "Categories retrieved successfully.",
        ...result,
      });
    } catch (error) {
      return sendError(res, error);
    }
  },

  async show(req: Request, res: Response): Promise<Response> {
    try {
      const id = parsePositiveInt(req.params.id);

      if (id === null) {
        return res.status(400).json({
          message: "Category ID must be a positive integer.",
        });
      }

      const category = await categoryService.getById(id);

      return res.status(200).json({
        message: "Category retrieved successfully.",
        data: category,
      });
    } catch (error) {
      return sendError(res, error);
    }
  },

  async store(req: Request, res: Response): Promise<Response> {
    try {
      const {
        disciplineId,
        parentId,
        name,
        code,
        description,
        sortOrder,
      } = req.body ?? {};

      if (
        typeof disciplineId !== "number" ||
        !Number.isSafeInteger(disciplineId) ||
        disciplineId <= 0
      ) {
        return res.status(400).json({
          message: "disciplineId must be a positive integer.",
        });
      }

      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          message: "Category name is required.",
        });
      }

      if (
        parentId !== undefined &&
        parentId !== null &&
        (typeof parentId !== "number" ||
          !Number.isSafeInteger(parentId) ||
          parentId <= 0)
      ) {
        return res.status(400).json({
          message: "parentId must be a positive integer or null.",
        });
      }

      if (
        sortOrder !== undefined &&
        (!Number.isInteger(sortOrder) || sortOrder < 0)
      ) {
        return res.status(400).json({
          message: "sortOrder must be a non-negative integer.",
        });
      }

      if (code !== undefined && code !== null && typeof code !== "string") {
        return res.status(400).json({
          message: "code must be a string or null.",
        });
      }

      if (
        description !== undefined &&
        description !== null &&
        typeof description !== "string"
      ) {
        return res.status(400).json({
          message: "description must be a string or null.",
        });
      }

      const category = await categoryService.create({
        disciplineId,
        ...(parentId !== undefined ? { parentId } : {}),
        name,
        ...(code !== undefined ? { code } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(sortOrder !== undefined ? { sortOrder } : {}),
      });

      return res.status(201).json({
        message: "Category created successfully.",
        data: category,
      });
    } catch (error) {
      return sendError(res, error);
    }
  },

  async update(req: Request, res: Response): Promise<Response> {
    try {
      const id = parsePositiveInt(req.params.id);

      if (id === null) {
        return res.status(400).json({
          message: "Category ID must be a positive integer.",
        });
      }

      const {
        disciplineId,
        parentId,
        name,
        code,
        description,
        sortOrder,
      } = req.body ?? {};

      if (
        disciplineId !== undefined &&
        (typeof disciplineId !== "number" ||
          !Number.isSafeInteger(disciplineId) ||
          disciplineId <= 0)
      ) {
        return res.status(400).json({
          message: "disciplineId must be a positive integer.",
        });
      }

      if (name !== undefined && (typeof name !== "string" || !name.trim())) {
        return res.status(400).json({
          message: "Category name must be a non-empty string.",
        });
      }

      if (
        parentId !== undefined &&
        parentId !== null &&
        (typeof parentId !== "number" ||
          !Number.isSafeInteger(parentId) ||
          parentId <= 0)
      ) {
        return res.status(400).json({
          message: "parentId must be a positive integer or null.",
        });
      }

      if (
        sortOrder !== undefined &&
        (!Number.isInteger(sortOrder) || sortOrder < 0)
      ) {
        return res.status(400).json({
          message: "sortOrder must be a non-negative integer.",
        });
      }

      if (code !== undefined && code !== null && typeof code !== "string") {
        return res.status(400).json({
          message: "code must be a string or null.",
        });
      }

      if (
        description !== undefined &&
        description !== null &&
        typeof description !== "string"
      ) {
        return res.status(400).json({
          message: "description must be a string or null.",
        });
      }

      const category = await categoryService.update(id, {
        ...(disciplineId !== undefined ? { disciplineId } : {}),
        ...(parentId !== undefined ? { parentId } : {}),
        ...(name !== undefined ? { name } : {}),
        ...(code !== undefined ? { code } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(sortOrder !== undefined ? { sortOrder } : {}),
      });

      return res.status(200).json({
        message: "Category updated successfully.",
        data: category,
      });
    } catch (error) {
      return sendError(res, error);
    }
  },

  async updateStatus(req: Request, res: Response): Promise<Response> {
    try {
      const id = parsePositiveInt(req.params.id);
      const { isActive } = req.body ?? {};

      if (id === null) {
        return res.status(400).json({
          message: "Category ID must be a positive integer.",
        });
      }

      if (typeof isActive !== "boolean") {
        return res.status(400).json({
          message: "isActive must be a boolean.",
        });
      }

      const category = await categoryService.setStatus(id, isActive);

      return res.status(200).json({
        message: "Category status updated successfully.",
        data: category,
      });
    } catch (error) {
      return sendError(res, error);
    }
  },

  async destroy(req: Request, res: Response): Promise<Response> {
    try {
      const id = parsePositiveInt(req.params.id);

      if (id === null) {
        return res.status(400).json({
          message: "Category ID must be a positive integer.",
        });
      }

      await categoryService.delete(id);

      return res.status(200).json({
        message: "Category deleted successfully.",
      });
    } catch (error) {
      return sendError(res, error);
    }
  },
};
