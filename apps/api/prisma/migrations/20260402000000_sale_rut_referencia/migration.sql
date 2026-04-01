-- AlterTable: agregar rutCliente y ventaReferenciaId a la tabla sales
ALTER TABLE "sales" ADD COLUMN "rutCliente" TEXT;
ALTER TABLE "sales" ADD COLUMN "ventaReferenciaId" TEXT;
