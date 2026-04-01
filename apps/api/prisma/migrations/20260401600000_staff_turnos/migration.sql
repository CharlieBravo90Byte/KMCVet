-- CreateTable: staff (personal de la clínica)
CREATE TABLE "staff" (
    "id"        TEXT NOT NULL PRIMARY KEY,
    "tenantId"  TEXT NOT NULL,
    "nombre"    TEXT NOT NULL,
    "cargo"     TEXT NOT NULL DEFAULT 'OTRO',
    "email"     TEXT,
    "telefono"  TEXT,
    "notas"     TEXT,
    "activo"    BOOLEAN NOT NULL DEFAULT 1,
    "color"     TEXT NOT NULL DEFAULT 'emerald',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "staff_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: turnos (turnos de trabajo)
CREATE TABLE "turnos" (
    "id"       TEXT NOT NULL PRIMARY KEY,
    "staffId"  TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fecha"    TEXT NOT NULL,
    "tipo"     TEXT NOT NULL DEFAULT 'DIA',
    "notas"    TEXT,
    CONSTRAINT "turnos_staffId_fkey"  FOREIGN KEY ("staffId")  REFERENCES "staff"   ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "turnos_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "turnos_staffId_fecha_key" ON "turnos"("staffId", "fecha");
