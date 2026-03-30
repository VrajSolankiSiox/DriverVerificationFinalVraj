-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'REP');

-- CreateEnum
CREATE TYPE "HotelRoleType" AS ENUM ('SUBJECT', 'COMP');

-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('DRAFT', 'PARSED', 'VALIDATED', 'IMPORTED', 'PARTIAL_FAILED', 'FAILED');

-- CreateEnum
CREATE TYPE "ImportMode" AS ENUM ('APPEND_NEW', 'UPSERT_MATCHING');

-- CreateEnum
CREATE TYPE "SnapshotStatus" AS ENUM ('PENDING', 'COMPLETE', 'FAILED');

-- CreateEnum
CREATE TYPE "ReviewSource" AS ENUM ('TRIPADVISOR', 'GOOGLE', 'EXPEDIA', 'BOOKING');

-- CreateEnum
CREATE TYPE "AlertMetric" AS ENUM ('RATE_GAP', 'WEBSITE_SCORE', 'REVIEW_RANK', 'SEO_SCORE');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'REVIEW_READY', 'APPROVED', 'EXPORTED');

-- CreateEnum
CREATE TYPE "ReportSectionType" AS ENUM ('COVER', 'EXECUTIVE_SUMMARY', 'COMPETITIVE_GAP_SUMMARY', 'SUBJECT_SNAPSHOT', 'COMPSET_OVERVIEW', 'RATE_POSITIONING_SUMMARY', 'RATE_COMPARISON_90_DAY', 'WEEKDAY_WEEKEND_POSITIONING', 'GAP_ANALYSIS', 'WEBSITE_AUDIT', 'OPPORTUNITY_BUCKETS', 'ACTION_PLAN_30_60_90', 'BATTLECARD', 'DISCLAIMER_METHOD', 'REVIEW_SNAPSHOT', 'SEO_FINDINGS');

-- CreateEnum
CREATE TYPE "SectionVisibility" AS ENUM ('CLIENT_SAFE', 'INTERNAL_ONLY');

-- CreateEnum
CREATE TYPE "ExportType" AS ENUM ('PPTX', 'PDF');

-- CreateEnum
CREATE TYPE "ExportVisibility" AS ENUM ('CLIENT_SAFE', 'INTERNAL_FULL');

-- CreateEnum
CREATE TYPE "ExportStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "ConfidenceLevel" AS ENUM ('LOW', 'MODERATE', 'HIGH');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Hotel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "country" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "bookingUrl" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "roomCount" INTEGER,
    "starLevel" DECIMAL(3,1),
    "ownershipNotes" TEXT,
    "managementNotes" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hotel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompSet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subjectHotelId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompSetMember" (
    "id" TEXT NOT NULL,
    "compSetId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "roleType" "HotelRoleType" NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompSetMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadMappingTemplate" (
    "id" TEXT NOT NULL,
    "organizationKey" TEXT NOT NULL DEFAULT 'rank-me-now',
    "sourceName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mappingJson" JSONB NOT NULL,
    "normalizationJson" JSONB,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UploadMappingTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadBatch" (
    "id" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "subjectHotelId" TEXT NOT NULL,
    "compSetId" TEXT NOT NULL,
    "status" "UploadStatus" NOT NULL DEFAULT 'DRAFT',
    "importMode" "ImportMode" NOT NULL DEFAULT 'APPEND_NEW',
    "workbookMetaJson" JSONB,
    "selectedSheet" TEXT,
    "mappingJson" JSONB,
    "previewJson" JSONB,
    "validationJson" JSONB,
    "summaryJson" JSONB,
    "originalMetadataJson" JSONB,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UploadBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateObservation" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "uploadBatchId" TEXT,
    "stayDate" TIMESTAMP(3) NOT NULL,
    "captureDate" TIMESTAMP(3) NOT NULL,
    "roomType" TEXT,
    "ratePlan" TEXT,
    "refundableFlag" BOOLEAN,
    "nightlyRate" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "availabilityStatus" TEXT,
    "sourceHotelName" TEXT,
    "sourceHotelCode" TEXT,
    "uniqueKey" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteSnapshot" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "status" "SnapshotStatus" NOT NULL DEFAULT 'PENDING',
    "scoreTotal" INTEGER,
    "directBookingUxScore" INTEGER,
    "contentCompletenessScore" INTEGER,
    "technicalHygieneScore" INTEGER,
    "offerVisibilityScore" INTEGER,
    "trustContactScore" INTEGER,
    "seoScoreTotal" INTEGER,
    "seoFindingsJson" JSONB,
    "summaryJson" JSONB,
    "rawFindingsJson" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsitePageSnapshot" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "pageType" TEXT,
    "crawlDepth" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT,
    "metaDescription" TEXT,
    "h1Count" INTEGER,
    "canonical" TEXT,
    "robotsMeta" TEXT,
    "bookingCtaDetected" BOOLEAN,
    "bookingCtaCount" INTEGER,
    "bookingEngineDetected" BOOLEAN,
    "phoneDetected" BOOLEAN,
    "emailDetected" BOOLEAN,
    "addressDetected" BOOLEAN,
    "faqDetected" BOOLEAN,
    "structuredDataDetected" BOOLEAN,
    "sitemapReference" BOOLEAN,
    "imageCount" INTEGER,
    "imageAltCoverage" DOUBLE PRECISION,
    "internalLinksJson" JSONB,
    "extractedJson" JSONB,
    "rawHtml" TEXT,
    "seoScore" INTEGER,
    "h2Count" INTEGER,
    "h3Count" INTEGER,
    "wordCount" INTEGER,
    "keywordDensityJson" JSONB,
    "ogTagsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsitePageSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewSnapshot" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "source" "ReviewSource" NOT NULL,
    "averageRating" DECIMAL(3,2),
    "reviewCount" INTEGER,
    "sentimentSummary" TEXT,
    "rawJson" JSONB,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertRule" (
    "id" TEXT NOT NULL,
    "reportId" TEXT,
    "hotelId" TEXT,
    "metric" "AlertMetric" NOT NULL,
    "threshold" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "alertRuleId" TEXT,
    "reportId" TEXT,
    "hotelId" TEXT,
    "metric" "AlertMetric" NOT NULL,
    "message" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'WARNING',
    "firedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedById" TEXT,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subjectHotelId" TEXT NOT NULL,
    "compSetId" TEXT NOT NULL,
    "compSetVersion" INTEGER NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "confidenceLevel" "ConfidenceLevel",
    "executiveSummary" TEXT,
    "manualOpportunityNotes" TEXT,
    "methodologyNote" TEXT,
    "analysisJson" JSONB,
    "compSnapshotJson" JSONB,
    "presentationConfigJson" JSONB,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportSection" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "type" "ReportSectionType" NOT NULL,
    "title" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "visibility" "SectionVisibility" NOT NULL DEFAULT 'CLIENT_SAFE',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "contentJson" JSONB NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportArtifact" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "type" "ExportType" NOT NULL,
    "visibility" "ExportVisibility" NOT NULL,
    "status" "ExportStatus" NOT NULL DEFAULT 'PENDING',
    "storagePath" TEXT,
    "fileName" TEXT,
    "errorMessage" TEXT,
    "generatedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExportArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "message" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "Hotel_name_idx" ON "Hotel"("name");

-- CreateIndex
CREATE INDEX "Hotel_city_country_idx" ON "Hotel"("city", "country");

-- CreateIndex
CREATE INDEX "CompSet_subjectHotelId_idx" ON "CompSet"("subjectHotelId");

-- CreateIndex
CREATE INDEX "CompSet_isActive_idx" ON "CompSet"("isActive");

-- CreateIndex
CREATE INDEX "CompSetMember_compSetId_displayOrder_idx" ON "CompSetMember"("compSetId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CompSetMember_compSetId_hotelId_key" ON "CompSetMember"("compSetId", "hotelId");

-- CreateIndex
CREATE INDEX "UploadMappingTemplate_organizationKey_sourceName_idx" ON "UploadMappingTemplate"("organizationKey", "sourceName");

-- CreateIndex
CREATE INDEX "UploadBatch_subjectHotelId_idx" ON "UploadBatch"("subjectHotelId");

-- CreateIndex
CREATE INDEX "UploadBatch_compSetId_idx" ON "UploadBatch"("compSetId");

-- CreateIndex
CREATE INDEX "UploadBatch_status_idx" ON "UploadBatch"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RateObservation_uniqueKey_key" ON "RateObservation"("uniqueKey");

-- CreateIndex
CREATE INDEX "RateObservation_hotelId_stayDate_idx" ON "RateObservation"("hotelId", "stayDate");

-- CreateIndex
CREATE INDEX "RateObservation_captureDate_idx" ON "RateObservation"("captureDate");

-- CreateIndex
CREATE INDEX "WebsiteSnapshot_hotelId_createdAt_idx" ON "WebsiteSnapshot"("hotelId", "createdAt");

-- CreateIndex
CREATE INDEX "WebsitePageSnapshot_snapshotId_crawlDepth_idx" ON "WebsitePageSnapshot"("snapshotId", "crawlDepth");

-- CreateIndex
CREATE INDEX "ReviewSnapshot_hotelId_source_capturedAt_idx" ON "ReviewSnapshot"("hotelId", "source", "capturedAt");

-- CreateIndex
CREATE INDEX "Report_subjectHotelId_createdAt_idx" ON "Report"("subjectHotelId", "createdAt");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE INDEX "ReportSection_reportId_displayOrder_idx" ON "ReportSection"("reportId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ReportSection_reportId_type_key" ON "ReportSection"("reportId", "type");

-- CreateIndex
CREATE INDEX "ExportArtifact_reportId_generatedAt_idx" ON "ExportArtifact"("reportId", "generatedAt");

-- CreateIndex
CREATE INDEX "ActivityLog_entityType_entityId_createdAt_idx" ON "ActivityLog"("entityType", "entityId", "createdAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompSet" ADD CONSTRAINT "CompSet_subjectHotelId_fkey" FOREIGN KEY ("subjectHotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompSetMember" ADD CONSTRAINT "CompSetMember_compSetId_fkey" FOREIGN KEY ("compSetId") REFERENCES "CompSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompSetMember" ADD CONSTRAINT "CompSetMember_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadBatch" ADD CONSTRAINT "UploadBatch_subjectHotelId_fkey" FOREIGN KEY ("subjectHotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadBatch" ADD CONSTRAINT "UploadBatch_compSetId_fkey" FOREIGN KEY ("compSetId") REFERENCES "CompSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateObservation" ADD CONSTRAINT "RateObservation_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateObservation" ADD CONSTRAINT "RateObservation_uploadBatchId_fkey" FOREIGN KEY ("uploadBatchId") REFERENCES "UploadBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteSnapshot" ADD CONSTRAINT "WebsiteSnapshot_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsitePageSnapshot" ADD CONSTRAINT "WebsitePageSnapshot_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "WebsiteSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewSnapshot" ADD CONSTRAINT "ReviewSnapshot_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_subjectHotelId_fkey" FOREIGN KEY ("subjectHotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_compSetId_fkey" FOREIGN KEY ("compSetId") REFERENCES "CompSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportSection" ADD CONSTRAINT "ReportSection_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportArtifact" ADD CONSTRAINT "ExportArtifact_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
