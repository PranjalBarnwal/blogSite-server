-- DropIndex
DROP INDEX "User_social_key";

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "isAnonymous" BOOLEAN NOT NULL DEFAULT false;
