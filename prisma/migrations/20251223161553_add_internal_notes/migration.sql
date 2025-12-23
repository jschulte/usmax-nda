-- CreateTable
CREATE TABLE "internal_notes" (
    "id" TEXT NOT NULL,
    "nda_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "note_text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "internal_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "internal_notes_nda_id_idx" ON "internal_notes"("nda_id");

-- CreateIndex
CREATE INDEX "internal_notes_user_id_idx" ON "internal_notes"("user_id");

-- AddForeignKey
ALTER TABLE "internal_notes" ADD CONSTRAINT "internal_notes_nda_id_fkey" FOREIGN KEY ("nda_id") REFERENCES "ndas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_notes" ADD CONSTRAINT "internal_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
