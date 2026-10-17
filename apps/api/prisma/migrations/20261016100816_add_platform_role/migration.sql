-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('super_admin', 'user');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "platform_role" "PlatformRole" NOT NULL DEFAULT 'user';
