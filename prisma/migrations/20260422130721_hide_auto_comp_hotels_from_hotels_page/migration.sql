-- CreateEnum
CREATE TYPE "HotelProfileSource" AS ENUM ('MANUAL', 'AUTO_COMPSET');

-- AlterTable
ALTER TABLE "Hotel" ADD COLUMN     "profileSource" "HotelProfileSource" NOT NULL DEFAULT 'MANUAL';
