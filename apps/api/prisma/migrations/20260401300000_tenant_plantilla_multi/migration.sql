-- AlterTable: agregar plantillaFacturaUrl y plantillaNotaCreditoUrl al tenant
ALTER TABLE "tenants" ADD COLUMN "plantillaFacturaUrl" TEXT;
ALTER TABLE "tenants" ADD COLUMN "plantillaNotaCreditoUrl" TEXT;
