
import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import prisma from "../config/prisma.js";
import authService from "../services/auth.service.js";

export interface AuthenticatedRequest extends Request {
  auth?: {
    userId: number;
  };
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authorization = req.header("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication token is required.",
    });
  }

  const token = authorization.slice("Bearer ".length).trim();

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication token is required.",
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      authService.getJwtSecret(),
      {
        issuer: "boq-api",
        audience: "boq-web",
      }
    ) as JwtPayload;

    // JWT subject is a string, but the database ID is an integer.
    if (
      typeof decoded.sub !== "string" ||
      !/^[1-9]\d*$/.test(decoded.sub)
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    const userId = Number(decoded.sub);

    if (!Number.isSafeInteger(userId)) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    // Check the database on every protected request.
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive or no longer exists.",
      });
    }

    req.auth = {
      userId: user.id,
    };

    return next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired authentication token.",
      });
    }

    console.error("Authentication middleware error:", error);

    return res.status(500).json({
      success: false,
      message: "An unexpected server error occurred.",
    });
  }
}
