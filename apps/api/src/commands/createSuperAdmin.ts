
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client.js";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
const adminNameEnv = process.env.SUPER_ADMIN_NAME;
const adminEmailEnv = process.env.SUPER_ADMIN_EMAIL;
const adminPasswordEnv = process.env.SUPER_ADMIN_PASSWORD;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing.");
}

if (!adminNameEnv || !adminEmailEnv || !adminPasswordEnv) {
  throw new Error(
    "SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL, and SUPER_ADMIN_PASSWORD must be configured."
  );
}

if (adminPasswordEnv.length < 8) {
  throw new Error("SUPER_ADMIN_PASSWORD must be at least 8 characters long.");
}

// These validated constants are guaranteed to be strings.
const adminName: string = adminNameEnv;
const adminEmail: string = adminEmailEnv;
const adminPassword: string = adminPasswordEnv;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  try {
    console.log("Checking Super Admin configuration...");

    const passwordHash: string = await bcrypt.hash(adminPassword, 12);

    await prisma.$transaction(async (tx) => {
      // 1. Find or create the platform-level Super Admin role.
      let superAdminRole = await tx.role.findFirst({
        where: {
          code: "super_admin",
          scope: "platform",
          organizationId: null,
        },
      });

      if (!superAdminRole) {
        superAdminRole = await tx.role.create({
          data: {
            name: "Super Admin",
            code: "super_admin",
            description:
              "Full access to platform administration and all organizations.",
            scope: "platform",
            organizationId: null,
            isSystem: true,
            isActive: true,
          },
        });

        console.log("Super Admin role created.");
      } else if (!superAdminRole.isActive) {
        superAdminRole = await tx.role.update({
          where: { id: superAdminRole.id },
          data: { isActive: true },
        });

        console.log("Existing Super Admin role activated.");
      }

      // 2. Find or create the administrator user.
      let adminUser = await tx.user.findUnique({
        where: { email: adminEmail },
      });

      if (!adminUser) {
        adminUser = await tx.user.create({
          data: {
            name: adminName,
            email: adminEmail,
            passwordHash,
            isActive: true,
          },
        });

        console.log("Super Admin user created.");
      } else {
        if (!adminUser.isActive) {
          adminUser = await tx.user.update({
            where: { id: adminUser.id },
            data: { isActive: true },
          });

          console.log("Existing administrator account activated.");
        }

        console.log(
          "Existing user's name and password were preserved."
        );
      }

      // 3. Assign the platform role if it is not already assigned.
      const existingAssignment = await tx.userPlatformRole.findUnique({
        where: {
          userId_roleId: {
            userId: adminUser.id,
            roleId: superAdminRole.id,
          },
        },
      });

      if (!existingAssignment) {
        await tx.userPlatformRole.create({
          data: {
            userId: adminUser.id,
            roleId: superAdminRole.id,
          },
        });

        console.log("Super Admin role assigned to the user.");
      } else {
        console.log("Super Admin role is already assigned.");
      }

      console.log("\nSuper Admin setup completed successfully.");
      console.log({
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        role: superAdminRole.code,
        scope: superAdminRole.scope,
        isActive: adminUser.isActive,
      });
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("Failed to create Super Admin:", error);
  process.exitCode = 1;
});
