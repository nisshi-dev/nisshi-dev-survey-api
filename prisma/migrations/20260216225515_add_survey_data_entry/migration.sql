-- AlterTable
ALTER TABLE "Response" ADD COLUMN     "dataEntryId" TEXT;

-- CreateTable
CREATE TABLE "SurveyDataEntry" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "values" JSONB NOT NULL DEFAULT '{}',
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurveyDataEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SurveyDataEntry_surveyId_idx" ON "SurveyDataEntry"("surveyId");

-- CreateIndex
CREATE INDEX "Response_dataEntryId_idx" ON "Response"("dataEntryId");

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_dataEntryId_fkey" FOREIGN KEY ("dataEntryId") REFERENCES "SurveyDataEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyDataEntry" ADD CONSTRAINT "SurveyDataEntry_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
