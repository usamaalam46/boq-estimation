
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import type { LoginInput } from "../validators/auth.validator.js";

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  isActive: true,

  platformRoles: {
    where: {
      role: {
        isActive: true,
        scope: "platform" as const,
      },
    },
    select: {
      role: {
        select: {
          id: true,
          name: true,
          code: true,
          scope: true,
          rolePermissions: {
            select: {
              permission: {
                select: {
                  code: true,
                },
              },
            },
          },
        },
      },
    },
  },

  memberships: {
    where: {
      organization: {
        isActive: true,
      },
      role: {
        isActive: true,
        scope: "organization" as const,
      },
    },
    select: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      role: {
        select: {
          id: true,
          name: true,
          code: true,
          scope: true,
          rolePermissions: {
            select: {
              permission: {
                select: {
                  code: true,
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET must be configured and contain at least 32 characters."
    );
  }

  return secret;
}

function formatUser(user: any) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isActive: user.isActive,

    platformRoles: user.platformRoles.map((assignment: any) => ({
      id: assignment.role.id,
      name: assignment.role.name,
      code: assignment.role.code,
      permissions: assignment.role.rolePermissions.map(
        (rp: any) => rp.permission.code
      ),
    })),

    memberships: user.memberships.map((membership: any) => ({
      organization: membership.organization,
      role: {
        id: membership.role.id,
        name: membership.role.name,
        code: membership.role.code,
        permissions: membership.role.rolePermissions.map(
          (rp: any) => rp.permission.code
        ),
      },
    })),
  };
}

const authService = {
  async login({ email, password }: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Use the same error for an unknown email or incorrect password.
    if (!user) {
      throw new Error("INVALID_CREDENTIALS");
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatches) {
      throw new Error("INVALID_CREDENTIALS");
    }

    if (!user.isActive) {
      throw new Error("ACCOUNT_INACTIVE");
    }

    // JWT subject must be a string, even when the database ID is an integer.
    const token = jwt.sign(
      {},
      getJwtSecret(),
      {
        subject: String(user.id),
        expiresIn: "1d",
        issuer: "boq-api",
        audience: "boq-web",
      }
    );

    const currentUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
      select: publicUserSelect,
    });

    if (!currentUser) {
      throw new Error("USER_NOT_FOUND");
    }

    return {
      token,
      user: formatUser(currentUser),
    };
  },

  async getCurrentUser(userId: number) {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: publicUserSelect,
    });

    if (!user || !user.isActive) {
      throw new Error("ACCOUNT_INACTIVE");
    }

    return formatUser(user);
  },

  getJwtSecret,
};

export default authService;
