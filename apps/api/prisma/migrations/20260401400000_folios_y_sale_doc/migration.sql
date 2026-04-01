-- CreateTable folio_ranges
CREATE TABLE "folio_ranges" (
    "id"        TEXT NOT NULL PRIMARY KEY,
    "tenantId"  TEXT NOT NULL,
    "tipo"      TEXT NOT NULL,
    "desde"     INTEGER NOT NULL,
    "hasta"     INTEGER NOT NULL,
    "actual"    INTEGER NOT NULL,
    "activo"    BOOLEAN NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "folio_ranges_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- AlterTable sales: agregar tipoDoc y numeroDocumento
ALTER TABLE "sales" ADD COLUMN "tipoDoc" TEXT NOT NULL DEFAULT 'boleta';
ALTER TABLE "sales" ADD COLUMN "numeroDocumento" INTEGER;
