-- =============================================================================
-- KMCVet — Schema SQL Completo (Estado Final)
-- Motor:    SQLite
-- Generado: 2026-04-02
-- Migraciones aplicadas: 13
-- =============================================================================
-- Uso: este archivo puede usarse para crear la base de datos desde cero en un
--      entorno nuevo, sin necesidad de ejecutar las migraciones incrementales.
-- =============================================================================

PRAGMA foreign_keys = OFF;

-- -----------------------------------------------------------------------------
-- 1. TENANTS (veterinarias)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "tenants" (
    "id"                     TEXT     NOT NULL PRIMARY KEY,
    "slug"                   TEXT     NOT NULL,
    "nombre"                 TEXT     NOT NULL,
    "logoUrl"                TEXT,
    "plantillaBoletaUrl"     TEXT,
    "plantillaFacturaUrl"    TEXT,
    "plantillaNotaCreditoUrl" TEXT,
    "emailClinica"           TEXT,
    "telefonos"              TEXT,
    "colorPrimario"          TEXT     NOT NULL DEFAULT '#2563EB',
    "colorSecundario"        TEXT     NOT NULL DEFAULT '#10B981',
    "moneda"                 TEXT     NOT NULL DEFAULT 'CLP',
    "timezone"               TEXT     NOT NULL DEFAULT 'America/Santiago',
    "modulos"                TEXT     NOT NULL DEFAULT 'atencion,inventario',
    "activo"                 BOOLEAN  NOT NULL DEFAULT 1,
    "createdAt"              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"              DATETIME NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "tenants_slug_key" ON "tenants"("slug");

-- -----------------------------------------------------------------------------
-- 2. USERS (usuarios del sistema)
-- Roles: ADMIN | VET | RECEPTIONIST | INVENTORY
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "users" (
    "id"           TEXT     NOT NULL PRIMARY KEY,
    "tenantId"     TEXT     NOT NULL,
    "nombre"       TEXT     NOT NULL,
    "email"        TEXT     NOT NULL,
    "passwordHash" TEXT     NOT NULL,
    "telefono"     TEXT,
    "rol"          TEXT     NOT NULL DEFAULT 'RECEPTIONIST',
    "activo"       BOOLEAN  NOT NULL DEFAULT 1,
    "createdAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    DATETIME NOT NULL,
    CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId")
        REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_tenantId_email_key"
    ON "users"("tenantId", "email");

-- -----------------------------------------------------------------------------
-- 3. OWNERS (propietarios de mascotas)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "owners" (
    "id"        TEXT     NOT NULL PRIMARY KEY,
    "tenantId"  TEXT     NOT NULL,
    "nombre"    TEXT     NOT NULL,
    "documento" TEXT     NOT NULL,
    "telefono"  TEXT     NOT NULL,
    "email"     TEXT,
    "direccion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "owners_tenantId_fkey" FOREIGN KEY ("tenantId")
        REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "owners_tenantId_documento_key"
    ON "owners"("tenantId", "documento");

-- -----------------------------------------------------------------------------
-- 4. SUPPLIERS (proveedores)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "suppliers" (
    "id"       TEXT    NOT NULL PRIMARY KEY,
    "tenantId" TEXT    NOT NULL,
    "nombre"   TEXT    NOT NULL,
    "contacto" TEXT,
    "telefono" TEXT,
    "email"    TEXT,
    "activo"   BOOLEAN NOT NULL DEFAULT 1,
    CONSTRAINT "suppliers_tenantId_fkey" FOREIGN KEY ("tenantId")
        REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- -----------------------------------------------------------------------------
-- 5. PETS (mascotas)
-- Especies: DOG | CAT | BIRD | RABBIT | REPTILE | OTHER
-- Sexo:     MALE | FEMALE | UNKNOWN
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "pets" (
    "id"                 TEXT     NOT NULL PRIMARY KEY,
    "tenantId"           TEXT     NOT NULL,
    "propietarioId"      TEXT     NOT NULL,
    "nombre"             TEXT     NOT NULL,
    "especie"            TEXT     NOT NULL,
    "raza"               TEXT,
    "sexo"               TEXT     NOT NULL DEFAULT 'UNKNOWN',
    "fechaNacimiento"    DATETIME,
    "color"              TEXT,
    "microchip"          TEXT,
    "fotoUrl"            TEXT,
    "alergias"           TEXT,
    "condicionesPrevias" TEXT,
    "createdAt"          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          DATETIME NOT NULL,
    CONSTRAINT "pets_tenantId_fkey" FOREIGN KEY ("tenantId")
        REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "pets_propietarioId_fkey" FOREIGN KEY ("propietarioId")
        REFERENCES "owners" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- -----------------------------------------------------------------------------
-- 6. PET_WEIGHTS (historial de peso)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "pet_weights" (
    "id"     TEXT     NOT NULL PRIMARY KEY,
    "petId"  TEXT     NOT NULL,
    "pesoKg" REAL     NOT NULL,
    "fecha"  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pet_weights_petId_fkey" FOREIGN KEY ("petId")
        REFERENCES "pets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- -----------------------------------------------------------------------------
-- 7. PRODUCTS (inventario)
-- Categorias: MEDICATION | FOOD | SUPPLY | EQUIPMENT | OTHER
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "products" (
    "id"               TEXT     NOT NULL PRIMARY KEY,
    "tenantId"         TEXT     NOT NULL,
    "nombre"           TEXT     NOT NULL,
    "codigo"           TEXT,
    "descripcion"      TEXT,
    "categoria"        TEXT     NOT NULL,
    "unidad"           TEXT     NOT NULL DEFAULT 'unidad',
    "stockActual"      INTEGER  NOT NULL DEFAULT 0,
    "stockMinimo"      INTEGER  NOT NULL DEFAULT 0,
    "stockMaximo"      INTEGER,
    "precioCosto"      REAL,
    "precioVenta"      REAL,
    "fechaVencimiento" DATETIME,
    "proveedorId"      TEXT,
    "activo"           BOOLEAN  NOT NULL DEFAULT 1,
    "createdAt"        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        DATETIME NOT NULL,
    CONSTRAINT "products_tenantId_fkey" FOREIGN KEY ("tenantId")
        REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "products_proveedorId_fkey" FOREIGN KEY ("proveedorId")
        REFERENCES "suppliers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "products_tenantId_codigo_key"
    ON "products"("tenantId", "codigo");

-- -----------------------------------------------------------------------------
-- 8. APPOINTMENT_TYPES (tipos de atención configurables)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "appointment_types" (
    "id"        TEXT     NOT NULL PRIMARY KEY,
    "tenantId"  TEXT     NOT NULL,
    "label"     TEXT     NOT NULL,
    "precio"    REAL,
    "activo"    BOOLEAN  NOT NULL DEFAULT 1,
    "orden"     INTEGER  NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "appointment_types_tenantId_fkey" FOREIGN KEY ("tenantId")
        REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- -----------------------------------------------------------------------------
-- 9. APPOINTMENTS (citas)
-- Estados: PENDING | CONFIRMED | IN_PROGRESS | COMPLETED | CANCELLED
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "appointments" (
    "id"            TEXT     NOT NULL PRIMARY KEY,
    "tenantId"      TEXT     NOT NULL,
    "mascotaId"     TEXT     NOT NULL,
    "veterinarioId" TEXT     NOT NULL,
    "fechaHora"     DATETIME NOT NULL,
    "duracionMin"   INTEGER  NOT NULL DEFAULT 30,
    "motivo"        TEXT     NOT NULL,
    "estado"        TEXT     NOT NULL DEFAULT 'PENDING',
    "createdAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     DATETIME NOT NULL,
    CONSTRAINT "appointments_tenantId_fkey" FOREIGN KEY ("tenantId")
        REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "appointments_mascotaId_fkey" FOREIGN KEY ("mascotaId")
        REFERENCES "pets" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "appointments_veterinarioId_fkey" FOREIGN KEY ("veterinarioId")
        REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- -----------------------------------------------------------------------------
-- 10. CONSULTATIONS (consultas / atenciones)
--     citaId y veterinarioId son opcionales (consulta puede ser sin cita previa)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "consultations" (
    "id"            TEXT     NOT NULL PRIMARY KEY,
    "tenantId"      TEXT     NOT NULL,
    "citaId"        TEXT     UNIQUE,
    "veterinarioId" TEXT,
    "mascotaId"     TEXT     NOT NULL,
    "pesoKg"        REAL,
    "temperatura"   REAL,
    "diagnostico"   TEXT     NOT NULL,
    "tratamiento"   TEXT,
    "notas"         TEXT,
    "createdAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     DATETIME NOT NULL,
    CONSTRAINT "consultations_tenantId_fkey" FOREIGN KEY ("tenantId")
        REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "consultations_citaId_fkey" FOREIGN KEY ("citaId")
        REFERENCES "appointments" ("id") ON UPDATE CASCADE,
    CONSTRAINT "consultations_veterinarioId_fkey" FOREIGN KEY ("veterinarioId")
        REFERENCES "users" ("id") ON UPDATE CASCADE,
    CONSTRAINT "consultations_mascotaId_fkey" FOREIGN KEY ("mascotaId")
        REFERENCES "pets" ("id") ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "consultations_citaId_key"
    ON "consultations"("citaId") WHERE "citaId" IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 11. PRESCRIPTION_ITEMS (items de receta)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "prescription_items" (
    "id"         TEXT    NOT NULL PRIMARY KEY,
    "consultaId" TEXT    NOT NULL,
    "productoId" TEXT    NOT NULL,
    "cantidad"   INTEGER NOT NULL,
    "indicacion" TEXT,
    CONSTRAINT "prescription_items_consultaId_fkey" FOREIGN KEY ("consultaId")
        REFERENCES "consultations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "prescription_items_productoId_fkey" FOREIGN KEY ("productoId")
        REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- -----------------------------------------------------------------------------
-- 12. CONSULTATION_FILES (archivos adjuntos a consulta)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "consultation_files" (
    "id"         TEXT     NOT NULL PRIMARY KEY,
    "consultaId" TEXT     NOT NULL,
    "nombre"     TEXT     NOT NULL,
    "url"        TEXT     NOT NULL,
    "mimetype"   TEXT     NOT NULL,
    "createdAt"  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "consultation_files_consultaId_fkey" FOREIGN KEY ("consultaId")
        REFERENCES "consultations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- -----------------------------------------------------------------------------
-- 13. STOCK_MOVEMENTS (movimientos de inventario)
-- Tipos: IN | OUT | ADJUSTMENT
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "stock_movements" (
    "id"           TEXT     NOT NULL PRIMARY KEY,
    "productoId"   TEXT     NOT NULL,
    "tenantId"     TEXT     NOT NULL,
    "usuarioId"    TEXT     NOT NULL,
    "tipo"         TEXT     NOT NULL,
    "cantidad"     INTEGER  NOT NULL,
    "referenciaId" TEXT,
    "notas"        TEXT,
    "fecha"        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_movements_productoId_fkey" FOREIGN KEY ("productoId")
        REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "stock_movements_usuarioId_fkey" FOREIGN KEY ("usuarioId")
        REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- -----------------------------------------------------------------------------
-- 14. PURCHASE_ORDERS (órdenes de compra)
-- Estados: PENDING | RECEIVED | CANCELLED
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "purchase_orders" (
    "id"            TEXT     NOT NULL PRIMARY KEY,
    "tenantId"      TEXT     NOT NULL,
    "proveedorId"   TEXT     NOT NULL,
    "fecha"         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "numeroFactura" TEXT,
    "estado"        TEXT     NOT NULL DEFAULT 'PENDING',
    "notas"         TEXT,
    CONSTRAINT "purchase_orders_tenantId_fkey" FOREIGN KEY ("tenantId")
        REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "purchase_orders_proveedorId_fkey" FOREIGN KEY ("proveedorId")
        REFERENCES "suppliers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- -----------------------------------------------------------------------------
-- 15. PURCHASE_ORDER_ITEMS (items de orden de compra)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "purchase_order_items" (
    "id"             TEXT    NOT NULL PRIMARY KEY,
    "ordenId"        TEXT    NOT NULL,
    "productoId"     TEXT    NOT NULL,
    "cantidad"       INTEGER NOT NULL,
    "precioUnitario" REAL    NOT NULL,
    CONSTRAINT "purchase_order_items_ordenId_fkey" FOREIGN KEY ("ordenId")
        REFERENCES "purchase_orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "purchase_order_items_productoId_fkey" FOREIGN KEY ("productoId")
        REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- -----------------------------------------------------------------------------
-- 16. FOLIO_RANGES (rangos de folio tributario)
-- tipo: boleta | factura | nota_credito
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "folio_ranges" (
    "id"               TEXT     NOT NULL PRIMARY KEY,
    "tenantId"         TEXT     NOT NULL,
    "tipo"             TEXT     NOT NULL,
    "desde"            INTEGER  NOT NULL,
    "hasta"            INTEGER  NOT NULL,
    "actual"           INTEGER  NOT NULL,
    "activo"           BOOLEAN  NOT NULL DEFAULT 1,
    "fechaVencimiento" DATETIME,
    "createdAt"        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "folio_ranges_tenantId_fkey" FOREIGN KEY ("tenantId")
        REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- -----------------------------------------------------------------------------
-- 17. SALES (ventas)
-- tipoDoc:  boleta | factura | nota_credito
-- estado:   COMPLETADA | PENDIENTE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "sales" (
    "id"                TEXT     NOT NULL PRIMARY KEY,
    "tenantId"          TEXT     NOT NULL,
    "usuarioId"         TEXT     NOT NULL,
    "fecha"             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total"             REAL     NOT NULL,
    "notas"             TEXT,
    "tipoDoc"           TEXT     NOT NULL DEFAULT 'boleta',
    "numeroDocumento"   INTEGER,
    "estado"            TEXT     NOT NULL DEFAULT 'COMPLETADA',
    "rutCliente"        TEXT,
    "ventaReferenciaId" TEXT,
    "createdAt"         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sales_tenantId_fkey" FOREIGN KEY ("tenantId")
        REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "sales_usuarioId_fkey" FOREIGN KEY ("usuarioId")
        REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- -----------------------------------------------------------------------------
-- 18. SALE_ITEMS (items de venta)
-- tipo: PRODUCTO | SERVICIO
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "sale_items" (
    "id"             TEXT    NOT NULL PRIMARY KEY,
    "saleId"         TEXT    NOT NULL,
    "tipo"           TEXT    NOT NULL DEFAULT 'PRODUCTO',
    "descripcion"    TEXT    NOT NULL DEFAULT '',
    "productoId"     TEXT,
    "cantidad"       INTEGER NOT NULL,
    "precioUnitario" REAL    NOT NULL,
    "subtotal"       REAL    NOT NULL,
    CONSTRAINT "sale_items_saleId_fkey" FOREIGN KEY ("saleId")
        REFERENCES "sales" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "sale_items_productoId_fkey" FOREIGN KEY ("productoId")
        REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- -----------------------------------------------------------------------------
-- 19. STAFF (personal de la clínica, no requiere login)
-- cargo: MEDICO_VETERINARIO | ASISTENTE | ENFERMERO | RECEPCIONISTA | TECNICO | OTRO
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "staff" (
    "id"        TEXT     NOT NULL PRIMARY KEY,
    "tenantId"  TEXT     NOT NULL,
    "nombre"    TEXT     NOT NULL,
    "cargo"     TEXT     NOT NULL DEFAULT 'OTRO',
    "email"     TEXT,
    "telefono"  TEXT,
    "notas"     TEXT,
    "activo"    BOOLEAN  NOT NULL DEFAULT 1,
    "color"     TEXT     NOT NULL DEFAULT 'emerald',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "staff_tenantId_fkey" FOREIGN KEY ("tenantId")
        REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- -----------------------------------------------------------------------------
-- 20. TURNOS (turnos de trabajo del personal)
-- tipo: MANANA | TARDE | NOCHE | DIA | LIBRE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "turnos" (
    "id"       TEXT NOT NULL PRIMARY KEY,
    "staffId"  TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fecha"    TEXT NOT NULL,   -- formato YYYY-MM-DD
    "tipo"     TEXT NOT NULL DEFAULT 'DIA',
    "notas"    TEXT,
    CONSTRAINT "turnos_staffId_fkey" FOREIGN KEY ("staffId")
        REFERENCES "staff" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "turnos_tenantId_fkey" FOREIGN KEY ("tenantId")
        REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "turnos_staffId_fecha_key"
    ON "turnos"("staffId", "fecha");

-- -----------------------------------------------------------------------------
-- FIN
-- -----------------------------------------------------------------------------
PRAGMA foreign_keys = ON;
