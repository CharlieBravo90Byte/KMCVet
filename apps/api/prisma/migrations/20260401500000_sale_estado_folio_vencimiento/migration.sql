-- AlterTable: Sale agrega campo estado (PENDIENTE | COMPLETADA)
ALTER TABLE "sales" ADD COLUMN "estado" TEXT NOT NULL DEFAULT 'COMPLETADA';

-- AlterTable: FolioRange agrega fecha de vencimiento opcional
ALTER TABLE "folio_ranges" ADD COLUMN "fechaVencimiento" DATETIME;
