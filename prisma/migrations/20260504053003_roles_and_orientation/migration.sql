-- CreateEnum
CREATE TYPE "TVOrientation" AS ENUM ('LANDSCAPE', 'PORTRAIT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'SUPPORT';
ALTER TYPE "UserRole" ADD VALUE 'CONTENT_CREATOR';

-- AlterTable
ALTER TABLE "AdBanner" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tvOrientation" "TVOrientation" NOT NULL DEFAULT 'LANDSCAPE';

-- CreateIndex
CREATE INDEX "AdBanner_userId_active_order_idx" ON "AdBanner"("userId", "active", "order");

-- AddForeignKey
ALTER TABLE "AdBanner" ADD CONSTRAINT "AdBanner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
