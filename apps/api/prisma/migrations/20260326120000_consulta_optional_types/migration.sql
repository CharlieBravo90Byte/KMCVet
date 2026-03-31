-- Migration: citaId opcional en consultations + tabla appointment_types

-- SQLite no soporta DROP NOT NULL directamente; se recrea la tabla
PRAGMA foreign_keys=OFF;

CREATE TABLE "consultations_new" (
    "id"            TEXT NOT NULL PRIMARY KEY,
    "tenantId"      TEXT NOT NULL,
    "citaId"        TEXT,
    "veterinarioId" TEXT,
    "mascotaId"     TEXT NOT NULL,
    "pesoKg"        REAL,
    "temperatura"   REAL,
    "diagnostico"   TEXT NOT NULL,
    "tratamiento"   TEXT,
    "notas"         TEXT,
    "createdAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     DATETIME NOT NULL,
    CONSTRAINT "consultations_tenantId_fkey"      FOREIGN KEY ("tenantId")      REFERENCES "tenants"      ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "consultations_citaId_fkey"        FOREIGN KEY ("citaId")        REFERENCES "appointments" ("id") ON UPDATE CASCADE,
    CONSTRAINT "consultations_veterinarioId_fkey" FOREIGN KEY ("veterinarioId") REFERENCES "users"        ("id") ON UPDATE CASCADE,
    CONSTRAINT "consultations_mascotaId_fkey"     FOREIGN KEY ("mascotaId")     REFERENCES "pets"         ("id") ON UPDATE CASCADE
);

INSERT INTO "consultations_new" SELECT * FROM "consultations";
DROP TABLE "consultations";
ALTER TABLE "consultations_new" RENAME TO "consultations";

CREATE UNIQUE INDEX "consultations_citaId_key" ON "consultations"("citaId") WHERE "citaId" IS NOT NULL;

PRAGMA foreign_keys=ON;

-- Tabla de tipos de atención configurables
CREATE TABLE "appointment_types" (
    "id"        TEXT NOT NULL PRIMARY KEY,
    "tenantId"  TEXT NOT NULL,
    "label"     TEXT NOT NULL,
    "activo"    BOOLEAN NOT NULL DEFAULT 1,
    "orden"     INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "appointment_types_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
