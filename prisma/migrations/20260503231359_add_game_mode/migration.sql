-- CreateEnum
CREATE TYPE "GameMode" AS ENUM ('NORMAL', 'MASHDOOD');

-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "mode" "GameMode" NOT NULL DEFAULT 'NORMAL';
