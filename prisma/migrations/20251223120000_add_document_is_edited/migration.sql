-- Add is_edited flag for edited NDA documents (Story 3.13)
ALTER TABLE "documents"
  ADD COLUMN "is_edited" BOOLEAN NOT NULL DEFAULT false;
