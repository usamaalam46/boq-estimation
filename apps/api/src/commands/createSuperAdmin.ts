
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing.");
}

// Hardcoded Super Admin credentials for local development
const SUPER_ADMIN = {
  name: "Platform Administrator",
  email: "admin@boqestimation.local",
  password: "ChangeThisToYourOwnStrongPassword123!",
};

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const existingAdmin = await prisma.user.findFirst({
    where: { platformRole: "super_admin" },
    select: { id: true, email: true },
  });

  if (existingAdmin) {
    console.log(`Super Admin already exists: ${existingAdmin.email}`);
    return;
  }

  const email = SUPER_ADMIN.email.toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    throw new Error(`Email ${email} already belongs to another user.`);
  }

  if (SUPER_ADMIN.password.length < 12) {
    throw new Error("Password must contain at least 12 characters.");
  }

  const passwordHash = await bcrypt.hash(SUPER_ADMIN.password, 12);

  const user = await prisma.user.create({
    data: {
      name: SUPER_ADMIN.name,
      email,
      passwordHash,
      platformRole: "super_admin",
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      platformRole: true,
      isActive: true,
      createdAt: true,
    },
  });

  console.log("Super Admin created successfully:");
  console.log(user);
}

main()
  .catch((error: unknown) => {
    console.error("Failed to create Super Admin:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
