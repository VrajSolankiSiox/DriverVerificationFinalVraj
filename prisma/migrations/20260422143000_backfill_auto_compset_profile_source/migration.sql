-- Backfill existing auto-created compset hotels
UPDATE "Hotel" AS h
SET "profileSource" = 'AUTO_COMPSET'
WHERE h."addressLine1" = 'Unknown'
  AND h."city" = 'Unknown'
  AND h."country" = 'Unknown'
  AND EXISTS (
    SELECT 1
    FROM "CompSetMember" AS csm
    WHERE csm."hotelId" = h."id"
      AND csm."roleType" = 'COMP'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "CompSetMember" AS csm_subject
    WHERE csm_subject."hotelId" = h."id"
      AND csm_subject."roleType" = 'SUBJECT'
  );
