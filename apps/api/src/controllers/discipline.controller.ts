
import type { Request, Response, NextFunction } from "express";
import { Prisma } from "../../generated/prisma/client.js";
import { disciplineService } from "../services/discipline.service.js";

function getId(req: Request, res: Response): number | null {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
        res.status(400).json({
            success: false,
            message: "Discipline ID must be a positive integer.",
        });
        return null;
    }

    return id;
}

function handleError(
    error: unknown,
    res: Response,
    next: NextFunction
): void {
    if (error instanceof Error) {
        switch (error.message) {
            case "DISCIPLINE_NOT_FOUND":
                res.status(404).json({
                    success: false,
                    message: "Discipline not found.",
                });
                return;

            case "DISCIPLINE_NAME_AND_CODE_REQUIRED":
                res.status(400).json({
                    success: false,
                    message: "Discipline name and code are required.",
                });
                return;

            case "DISCIPLINE_HAS_DEPENDENCIES":
                res.status(409).json({
                    success: false,
                    message:
                        "Cannot delete this discipline because categories or catalogue items are linked to it.",
                });
                return;
        }
    }

    if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
    ) {
        res.status(409).json({
            success: false,
            message: "A discipline with this name or code already exists.",
        });
        return;
    }

    next(error);
}

export class DisciplineController {
    async index(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const search =
                typeof req.query.search === "string"
                    ? req.query.search
                    : undefined;

            let isActive: boolean | undefined;

            if (req.query.isActive === "true") {
                isActive = true;
            } else if (req.query.isActive === "false") {
                isActive = false;
            } else if (req.query.isActive !== undefined) {
                res.status(400).json({
                    success: false,
                    message: "isActive must be true or false.",
                });
                return;
            }

            const page =
                req.query.page === undefined ? 1 : Number(req.query.page);

            const limit =
                req.query.limit === undefined ? 10 : Number(req.query.limit);

            if (
                !Number.isInteger(page) ||
                page < 1 ||
                !Number.isInteger(limit) ||
                limit < 1
            ) {
                res.status(400).json({
                    success: false,
                    message: "page and limit must be positive integers.",
                });
                return;
            }

            const result = await disciplineService.list({
                ...(search !== undefined ? { search } : {}),
                ...(isActive !== undefined ? { isActive } : {}),
                page,
                limit,
            });
            res.status(200).json({
                success: true,
                message: "Disciplines retrieved successfully.",
                ...result,
            });
        } catch (error) {
            handleError(error, res, next);
        }
    }

    async show(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        const id = getId(req, res);
        if (id === null) return;

        try {
            const discipline = await disciplineService.getById(id);

            res.status(200).json({
                success: true,
                message: "Discipline retrieved successfully.",
                data: discipline,
            });
        } catch (error) {
            handleError(error, res, next);
        }
    }

    async store(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const { name, code, description } = req.body ?? {};

            if (
                typeof name !== "string" ||
                typeof code !== "string" ||
                (description !== undefined &&
                    description !== null &&
                    typeof description !== "string")
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        "name and code must be strings; description must be a string or null.",
                });
                return;
            }

            const discipline = await disciplineService.create({
                name,
                code,
                description,
            });

            res.status(201).json({
                success: true,
                message: "Discipline created successfully.",
                data: discipline,
            });
        } catch (error) {
            handleError(error, res, next);
        }
    }

    async update(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        const id = getId(req, res);
        if (id === null) return;

        try {
            const { name, code, description } = req.body ?? {};

            if (
                (name !== undefined && typeof name !== "string") ||
                (code !== undefined && typeof code !== "string") ||
                (description !== undefined &&
                    description !== null &&
                    typeof description !== "string")
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        "name and code must be strings; description must be a string or null.",
                });
                return;
            }

            if (
                name === undefined &&
                code === undefined &&
                description === undefined
            ) {
                res.status(400).json({
                    success: false,
                    message: "Provide at least one field to update.",
                });
                return;
            }

            const discipline = await disciplineService.update(id, {
                ...(name !== undefined ? { name } : {}),
                ...(code !== undefined ? { code } : {}),
                ...(description !== undefined ? { description } : {}),
            });

            res.status(200).json({
                success: true,
                message: "Discipline updated successfully.",
                data: discipline,
            });
        } catch (error) {
            handleError(error, res, next);
        }
    }

    async updateStatus(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        const id = getId(req, res);
        if (id === null) return;

        try {
            const { isActive } = req.body ?? {};

            if (typeof isActive !== "boolean") {
                res.status(400).json({
                    success: false,
                    message: "isActive must be a boolean.",
                });
                return;
            }

            const discipline = await disciplineService.setStatus(id, isActive);

            res.status(200).json({
                success: true,
                message: `Discipline ${isActive ? "activated" : "deactivated"} successfully.`,
                data: discipline,
            });
        } catch (error) {
            handleError(error, res, next);
        }
    }

    async destroy(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        const id = getId(req, res);
        if (id === null) return;

        try {
            const result = await disciplineService.delete(id);

            res.status(200).json({
                success: true,
                message: "Discipline deleted successfully.",
                data: result,
            });
        } catch (error) {
            handleError(error, res, next);
        }
    }
}

export const disciplineController = new DisciplineController();
