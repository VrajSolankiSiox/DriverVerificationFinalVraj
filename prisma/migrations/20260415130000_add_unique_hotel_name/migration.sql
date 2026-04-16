-- Add unique constraint for Hotel.name
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Hotel"
    GROUP BY "name"
    HAVING COUNT(*) > 1
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'Cannot add unique constraint on "Hotel"."name": duplicate names exist. Deduplicate first, then re-run migrations.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "Hotel_name_key" ON "Hotel"("name");
