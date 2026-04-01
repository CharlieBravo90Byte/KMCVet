-- AlterTable: add emailClinica and telefonos to tenants
ALTER TABLE "tenants" ADD COLUMN "emailClinica" TEXT;
ALTER TABLE "tenants" ADD COLUMN "telefonos" TEXT;
