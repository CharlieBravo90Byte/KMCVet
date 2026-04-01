/**
 * Migración manual: crea tablas staff y turnos si no existen.
 * Se ejecuta como parte del startup o manualmente con: node prisma/migrate-staff.js
 */
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, 'kmcvet.db'));

const checkStaff = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='staff'").get();
if (checkStaff) {
  console.log('staff ya existe');
} else {
  db.exec(`CREATE TABLE IF NOT EXISTS "staff" (
    "id"        TEXT NOT NULL PRIMARY KEY,
    "tenantId"  TEXT NOT NULL,
    "nombre"    TEXT NOT NULL,
    "cargo"     TEXT NOT NULL DEFAULT 'OTRO',
    "email"     TEXT,
    "telefono"  TEXT,
    "notas"     TEXT,
    "activo"    INTEGER NOT NULL DEFAULT 1,
    "color"     TEXT NOT NULL DEFAULT 'emerald',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "staff_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`);
  console.log('staff creada');
}

const checkTurnos = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='turnos'").get();
if (checkTurnos) {
  console.log('turnos ya existe');
} else {
  db.exec(`CREATE TABLE IF NOT EXISTS "turnos" (
    "id"       TEXT NOT NULL PRIMARY KEY,
    "staffId"  TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fecha"    TEXT NOT NULL,
    "tipo"     TEXT NOT NULL DEFAULT 'DIA',
    "notas"    TEXT,
    CONSTRAINT "turnos_staffId_fkey"  FOREIGN KEY ("staffId")  REFERENCES "staff"   ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "turnos_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`);
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS "turnos_staffId_fecha_key" ON "turnos"("staffId", "fecha")`);
  console.log('turnos creada');
}

console.log('Migración staff+turnos completada.');
