/*
  Warnings:

  - You are about to drop the column `url_expires_at` on the `candidates` table. All the data in the column will be lost.
  - Added the required column `selected_end` to the `schedule_bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `selected_start` to the `schedule_bookings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "InterviewType" ADD VALUE 'both';

-- DropIndex
DROP INDEX "candidates_url_expires_at_idx";

-- AlterTable
ALTER TABLE "candidates" DROP COLUMN "url_expires_at",
ADD COLUMN     "is_hidden" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "schedule_bookings" ADD COLUMN     "contact_name" TEXT,
ADD COLUMN     "selected_end" TIME NOT NULL,
ADD COLUMN     "selected_start" TIME NOT NULL;

-- CreateIndex
CREATE INDEX "candidates_is_hidden_idx" ON "candidates"("is_hidden");
