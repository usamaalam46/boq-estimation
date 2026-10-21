
import type { Request, Response } from "express";
import { Prisma } from "../../generated/prisma/client.js";
import { unitService } from "../services/unit.service.js";

function parsePositiveInt(value: unknown): number | null {
    if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
        return null;
    }

    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : null;
}

function sendError(res: Response, error: unknown): Response {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
            return res.status(409).json({
                message: "A unit with this symbol already exists.",
            });
        }

        if (error.code === "P2003") {
            return res.status(409).json({
                message: "This unit is referenced by another record.",
            });
        }
    }

    const message =
        error instanceof Error ? error.message : "An unexpected error occurred.";

    if (message === "UNIT_NOT_FOUND") {
        return res.status(404).json({ message: "Unit not found." });
    }

    if (message === "UNIT_IN_USE") {
        return res.status(409).json({
            message:
                "This unit is in use by catalogue items or estimate items and cannot be deleted.",
        });
    }

    if (
        message === "UNIT_NAME_REQUIRED" ||
        message === "UNIT_SYMBOL_REQUIRED"
    ) {
        return res.status(400).json({
            message:
                message === "UNIT_NAME_REQUIRED"
                    ? "Unit name is required."
                    : "Unit symbol is required.",
        });
    }

    console.error("Unit controller error:", error);

    return res.status(500).json({
        message: "An unexpected error occurred.",
    });
}

export const unitController = {
    async index(req: Request, res: Response): Promise<Response> {
        try {
            const page =
                req.query.page === undefined ? 1 : parsePositiveInt(req.query.page);

            const limit =
                req.query.limit === undefined ? 10 : parsePositiveInt(req.query.limit);

            if (page === null || limit === null || limit > 100) {
                return res.status(400).json({
                    message: "Page must be positive and limit must be between 1 and 100.",
                });
            }

            if (
                req.query.search !== undefined &&
                typeof req.query.search !== "string"
            ) {
                return res.status(400).json({
                    message: "search must be a string.",
                });
            }

            if (
                req.query.dimension !== undefined &&
                typeof req.query.dimension !== "string"
            ) {
                return res.status(400).json({
                    message: "dimension must be a string.",
                });
            }

            let isActive: boolean | undefined;

            if (req.query.isActive !== undefined) {
                if (req.query.isActive === "true") {
                    isActive = true;
                } else if (req.query.isActive === "false") {
                    isActive = false;
                } else {
                    return res.status(400).json({
                        message: 'isActive must be "true" or "false".',
                    });
                }
            }

            const search =
                typeof req.query.search === "string"
                    ? req.query.search.trim()
                    : undefined;

            const dimension =
                typeof req.query.dimension === "string"
                    ? req.query.dimension.trim()
                    : undefined;

            const result = await unitService.list({
                ...(search !== undefined ? { search } : {}),
                ...(dimension !== undefined ? { dimension } : {}),
                ...(isActive !== undefined ? { isActive } : {}),
                page,
                limit,
            });

            return res.status(200).json({
                message: "Units retrieved successfully.",
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
                    message: "Unit ID must be a positive integer.",
                });
            }

            const unit = await unitService.getById(id);

            return res.status(200).json({
                message: "Unit retrieved successfully.",
                data: unit,
            });
        } catch (error) {
            return sendError(res, error);
        }
    },

    async store(req: Request, res: Response): Promise<Response> {
        try {
            const { name, symbol, description, dimension } = req.body ?? {};

            if (typeof name !== "string" || !name.trim()) {
                return res.status(400).json({
                    message: "Unit name is required.",
                });
            }

            if (typeof symbol !== "string" || !symbol.trim()) {
                return res.status(400).json({
                    message: "Unit symbol is required.",
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

            if (
                dimension !== undefined &&
                dimension !== null &&
                typeof dimension !== "string"
            ) {
                return res.status(400).json({
                    message: "dimension must be a string or null.",
                });
            }

            const unit = await unitService.create({
                name,
                symbol,
                ...(description !== undefined ? { description } : {}),
                ...(dimension !== undefined ? { dimension } : {}),
            });

            return res.status(201).json({
                message: "Unit created successfully.",
                data: unit,
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
                    message: "Unit ID must be a positive integer.",
                });
            }

            const { name, symbol, description, dimension } = req.body ?? {};

            if (name !== undefined && (typeof name !== "string" || !name.trim())) {
                return res.status(400).json({
                    message: "Unit name must be a non-empty string.",
                });
            }

            if (
                symbol !== undefined &&
                (typeof symbol !== "string" || !symbol.trim())
            ) {
                return res.status(400).json({
                    message: "Unit symbol must be a non-empty string.",
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

            if (
                dimension !== undefined &&
                dimension !== null &&
                typeof dimension !== "string"
            ) {
                return res.status(400).json({
                    message: "dimension must be a string or null.",
                });
            }

            const unit = await unitService.update(id, {
                ...(name !== undefined ? { name } : {}),
                ...(symbol !== undefined ? { symbol } : {}),
                ...(description !== undefined ? { description } : {}),
                ...(dimension !== undefined ? { dimension } : {}),
            });

            return res.status(200).json({
                message: "Unit updated successfully.",
                data: unit,
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
                    message: "Unit ID must be a positive integer.",
                });
            }

            if (typeof isActive !== "boolean") {
                return res.status(400).json({
                    message: "isActive must be a boolean.",
                });
            }

            const unit = await unitService.setStatus(id, isActive);

            return res.status(200).json({
                message: "Unit status updated successfully.",
                data: unit,
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
                    message: "Unit ID must be a positive integer.",
                });
            }

            await unitService.delete(id);

            return res.status(200).json({
                message: "Unit deleted successfully.",
            });
        } catch (error) {
            return sendError(res, error);
        }
    },
};
