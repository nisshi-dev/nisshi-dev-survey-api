-- AlterTable
ALTER TABLE "Response" ADD COLUMN     "params" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "Survey" ADD COLUMN     "params" JSONB NOT NULL DEFAULT '[]';
