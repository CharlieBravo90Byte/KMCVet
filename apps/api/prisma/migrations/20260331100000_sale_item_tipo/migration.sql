-- Recrear sale_items con nuevos campos: tipo, descripcion y productoId opcional
PRAGMA foreign_keys=OFF;

CREATE TABLE "sale_items_new" (
    "id"             TEXT    NOT NULL PRIMARY KEY,
    "saleId"         TEXT    NOT NULL,
    "tipo"           TEXT    NOT NULL DEFAULT 'PRODUCTO',
    "descripcion"    TEXT    NOT NULL DEFAULT '',
    "productoId"     TEXT,
    "cantidad"       INTEGER NOT NULL,
    "precioUnitario" REAL    NOT NULL,
    "subtotal"       REAL    NOT NULL,
    CONSTRAINT "sale_items_saleId_fkey"     FOREIGN KEY ("saleId")     REFERENCES "sales" ("id")    ON DELETE CASCADE  ON UPDATE CASCADE,
    CONSTRAINT "sale_items_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "sale_items_new" ("id","saleId","tipo","descripcion","productoId","cantidad","precioUnitario","subtotal")
SELECT "id","saleId",'PRODUCTO',COALESCE("productoId",''),"productoId","cantidad","precioUnitario","subtotal"
FROM "sale_items";

DROP TABLE "sale_items";
ALTER TABLE "sale_items_new" RENAME TO "sale_items";

PRAGMA foreign_keys=ON;
