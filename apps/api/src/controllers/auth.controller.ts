
import type { Request, Response } from "express";
import { ZodError } from "zod";
import authService from "../services/auth.service.js";
import { loginSchema } from "../validators/auth.validator.js";

export async function login(req: Request, res: Response) {
  try {
    const credentials = loginSchema.parse(req.body);

    const result = await authService.login(credentials);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    if (error instanceof Error) {
      if (error.message === "INVALID_CREDENTIALS") {
        return res.status(401).json({
          success: false,
          message: "Invalid email address or password.",
        });
      }

      if (error.message === "ACCOUNT_INACTIVE") {
        return res.status(403).json({
          success: false,
          message: "Your account is inactive.",
        });
      }
    }

    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "An unexpected server error occurred.",
    });
  }
}
