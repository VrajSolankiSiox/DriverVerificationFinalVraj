ALTER TABLE "Hotel"
ADD COLUMN IF NOT EXISTS "ownerName" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'DemoOutcome'
  ) THEN
    CREATE TYPE "DemoOutcome" AS ENUM ('PENDING', 'NO_SHOW', 'COMPLETED', 'CANCELLED', 'RESCHEDULED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "DemoSession" (
  "id" TEXT NOT NULL,
  "hotelId" TEXT NOT NULL,
  "uploadBatchId" TEXT,
  "reportId" TEXT,
  "hotelName" TEXT NOT NULL,
  "hotelOwnerName" TEXT,
  "scheduledDate" TIMESTAMP(3),
  "outcome" "DemoOutcome" NOT NULL DEFAULT 'PENDING',
  "conductedBy" TEXT,
  "demoDate" TIMESTAMP(3),
  "ownerFeedback" TEXT,
  "additionalNotes" TEXT,
  "createdById" TEXT NOT NULL,
  "updatedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DemoSession_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "DemoSession"
ADD COLUMN IF NOT EXISTS "outcome" "DemoOutcome" NOT NULL DEFAULT 'PENDING';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'DemoSession'
      AND column_name = 'conducted'
  ) THEN
    UPDATE "DemoSession"
    SET "outcome" = CASE WHEN "conducted" THEN 'COMPLETED'::"DemoOutcome" ELSE 'PENDING'::"DemoOutcome" END
    WHERE "outcome" = 'PENDING'::"DemoOutcome";
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "DemoSession_hotelId_createdAt_idx" ON "DemoSession"("hotelId", "createdAt");
CREATE INDEX IF NOT EXISTS "DemoSession_uploadBatchId_idx" ON "DemoSession"("uploadBatchId");
CREATE INDEX IF NOT EXISTS "DemoSession_reportId_idx" ON "DemoSession"("reportId");
CREATE INDEX IF NOT EXISTS "DemoSession_outcome_idx" ON "DemoSession"("outcome");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'DemoSession_hotelId_fkey'
  ) THEN
    ALTER TABLE "DemoSession"
    ADD CONSTRAINT "DemoSession_hotelId_fkey"
    FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'DemoSession_uploadBatchId_fkey'
  ) THEN
    ALTER TABLE "DemoSession"
    ADD CONSTRAINT "DemoSession_uploadBatchId_fkey"
    FOREIGN KEY ("uploadBatchId") REFERENCES "UploadBatch"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'DemoSession_reportId_fkey'
  ) THEN
    ALTER TABLE "DemoSession"
    ADD CONSTRAINT "DemoSession_reportId_fkey"
    FOREIGN KEY ("reportId") REFERENCES "Report"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
