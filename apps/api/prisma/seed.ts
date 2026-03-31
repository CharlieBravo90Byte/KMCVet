import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Ejecutando seed de KMCVet...');

  // ── Tenant demo ───────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      slug: 'demo',
      nombre: 'Clínica Veterinaria Demo',
      colorPrimario: '#2563EB',
      colorSecundario: '#10B981',
      moneda: 'CLP',
      timezone: 'America/Santiago',
      modulos: 'atencion,inventario',
    },
  });
  console.log(`✅ Tenant creado: ${tenant.nombre} (slug: ${tenant.slug})`);

  // ── Admin ─────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Admin1234!', 12);
  const admin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@demo.kmcvet.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      nombre: 'Administrador',
      email: 'admin@demo.kmcvet.com',
      passwordHash,
      rol: 'ADMIN',
    },
  });
  console.log(`✅ Admin creado: ${admin.email}`);

  // ── Veterinario ───────────────────────────────────────────────
  const vetHash = await bcrypt.hash('Vet1234!', 12);
  const vet = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'vet@demo.kmcvet.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      nombre: 'Dra. María Pérez',
      email: 'vet@demo.kmcvet.com',
      passwordHash: vetHash,
      rol: 'VET',
    },
  });
  console.log(`✅ Veterinario creado: ${vet.email}`);

  // ── Propietario de prueba ─────────────────────────────────────
  const owner = await prisma.owner.upsert({
    where: { tenantId_documento: { tenantId: tenant.id, documento: '12345678-9' } },
    update: {},
    create: {
      tenantId: tenant.id,
      nombre: 'Juan González',
      documento: '12345678-9',
      telefono: '+56912345678',
      email: 'juan@ejemplo.com',
      direccion: 'Av. Principal 123, Santiago',
    },
  });
  console.log(`✅ Propietario creado: ${owner.nombre}`);

  // ── Mascota de prueba ─────────────────────────────────────────
  const pet = await prisma.pet.upsert({
    where: { id: 'seed-pet-001' },
    update: {},
    create: {
      id: 'seed-pet-001',
      tenantId: tenant.id,
      propietarioId: owner.id,
      nombre: 'Max',
      especie: 'DOG',
      raza: 'Labrador Retriever',
      sexo: 'MALE',
      color: 'Dorado',
    },
  });
  console.log(`✅ Mascota creada: ${pet.nombre} (${pet.especie})`);

  // ── Proveedor de prueba ───────────────────────────────────────
  const supplier = await prisma.supplier.create({
    data: {
      tenantId: tenant.id,
      nombre: 'Laboratorio VetPharma',
      contacto: 'Ventas',
      telefono: '+56222334455',
      email: 'ventas@vetpharma.cl',
    },
  }).catch(() => prisma.supplier.findFirst({ where: { tenantId: tenant.id } }));
  console.log(`✅ Proveedor creado: ${supplier!.nombre}`);

  // ── Productos de prueba ───────────────────────────────────────
  const productos = [
    { nombre: 'Amoxicilina 500mg', categoria: 'MEDICATION' as const, stockActual: 50, stockMinimo: 10 },
    { nombre: 'Royal Canin Adult Dog', categoria: 'FOOD' as const, stockActual: 20, stockMinimo: 5 },
    { nombre: 'Jeringas 5ml (caja 100)', categoria: 'SUPPLY' as const, stockActual: 10, stockMinimo: 2 },
  ];

  for (const p of productos) {
    await prisma.product.create({
      data: { tenantId: tenant.id, proveedorId: supplier!.id, ...p },
    }).catch(() => null); // ignora si ya existe
  }
  console.log(`✅ Productos de prueba creados`);

  console.log('\n🎉 Seed completado exitosamente!');
  console.log('   Admin:      admin@demo.kmcvet.com  /  Admin1234!');
  console.log('   Veterinario: vet@demo.kmcvet.com   /  Vet1234!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
