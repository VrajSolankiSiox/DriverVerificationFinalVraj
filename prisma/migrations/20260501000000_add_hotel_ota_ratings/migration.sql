-- Add otaRatings JSON column to Hotel table (already applied via db push)
ALTER TABLE "Hotel" ADD COLUMN IF NOT EXISTS "otaRatings" JSONB;
-- Add isSubject column if not already present (drift fix)
ALTER TABLE "Hotel" ADD COLUMN IF NOT EXISTS "isSubject" BOOLEAN NOT NULL DEFAULT false;
