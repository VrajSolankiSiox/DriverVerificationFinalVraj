-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "uploadBatchId" TEXT;

-- CreateIndex
CREATE INDEX "Report_uploadBatchId_idx" ON "Report"("uploadBatchId");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_uploadBatchId_fkey" FOREIGN KEY ("uploadBatchId") REFERENCES "UploadBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
