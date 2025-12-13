-- CreateEnum
CREATE TYPE "InterviewType" AS ENUM ('online', 'onsite');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('available', 'booked', 'blocked', 'cancelled');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "google_id" TEXT NOT NULL,
    "slack_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact_name" TEXT,
    "contact_email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "url_expires_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "start_time" TIME NOT NULL,
    "end_time" TIME NOT NULL,
    "interview_type" "InterviewType" NOT NULL DEFAULT 'online',
    "status" "ScheduleStatus" NOT NULL DEFAULT 'available',
    "blocked_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_bookings" (
    "id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "company_id" TEXT,
    "company_name" TEXT NOT NULL,
    "confirmed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedule_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE INDEX "companies_name_idx" ON "companies"("name");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_token_key" ON "candidates"("token");

-- CreateIndex
CREATE INDEX "candidates_created_by_idx" ON "candidates"("created_by");

-- CreateIndex
CREATE INDEX "candidates_url_expires_at_idx" ON "candidates"("url_expires_at");

-- CreateIndex
CREATE INDEX "schedules_candidate_id_idx" ON "schedules"("candidate_id");

-- CreateIndex
CREATE INDEX "schedules_status_idx" ON "schedules"("status");

-- CreateIndex
CREATE INDEX "schedules_date_idx" ON "schedules"("date");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_bookings_schedule_id_key" ON "schedule_bookings"("schedule_id");

-- CreateIndex
CREATE INDEX "schedule_bookings_candidate_id_idx" ON "schedule_bookings"("candidate_id");

-- CreateIndex
CREATE INDEX "schedule_bookings_company_id_idx" ON "schedule_bookings"("company_id");

-- CreateIndex
CREATE INDEX "schedule_bookings_confirmed_at_idx" ON "schedule_bookings"("confirmed_at");

-- CreateIndex
CREATE INDEX "schedule_bookings_cancelled_at_idx" ON "schedule_bookings"("cancelled_at");

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_blocked_by_fkey" FOREIGN KEY ("blocked_by") REFERENCES "schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_bookings" ADD CONSTRAINT "schedule_bookings_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_bookings" ADD CONSTRAINT "schedule_bookings_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_bookings" ADD CONSTRAINT "schedule_bookings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
