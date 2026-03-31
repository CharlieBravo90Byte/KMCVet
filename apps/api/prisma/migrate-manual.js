const Database = require('better-sqlite3');
const db = new Database('./prisma/kmcvet.db');
const check = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='appointment_types'").get();
if (check) {
  console.log('appointment_types ya existe');
} else {
  db.exec(`CREATE TABLE IF NOT EXISTS "appointment_types" (
    "id"        TEXT NOT NULL PRIMARY KEY,
    "tenantId"  TEXT NOT NULL,
    "label"     TEXT NOT NULL,
    "activo"    BOOLEAN NOT NULL DEFAULT 1,
    "orden"     INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "appointment_types_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`);
  console.log('appointment_types creada');
}
db.close();
