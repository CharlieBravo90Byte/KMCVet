import { z } from 'zod';

// ── Auth ─────────────────────────────────────────────────────
export const LoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
});
export type LoginDto = z.infer<typeof LoginSchema>;

// ── Propietario ──────────────────────────────────────────────
export const CreateOwnerSchema = z.object({
  nombre: z.string().min(2).max(120),
  documento: z.string().min(5).max(20),
  telefono: z.string().min(7).max(20),
  email: z.string().email().optional().or(z.literal('')),
  direccion: z.string().max(200).optional(),
});
export type CreateOwnerDto = z.infer<typeof CreateOwnerSchema>;

// ── Mascota ──────────────────────────────────────────────────
export const CreatePetSchema = z.object({
  nombre: z.string().min(1).max(80),
  especie: z.enum(['DOG', 'CAT', 'BIRD', 'RABBIT', 'REPTILE', 'OTHER']),
  raza: z.string().max(80).optional(),
  sexo: z.enum(['MALE', 'FEMALE', 'UNKNOWN']).default('UNKNOWN'),
  fechaNacimiento: z.string().datetime().optional(),
  color: z.string().max(50).optional(),
  microchip: z.string().max(50).optional(),
  alergias: z.string().max(500).optional(),
  condicionesPrevias: z.string().max(500).optional(),
  propietarioId: z.string().uuid(),
});
export type CreatePetDto = z.infer<typeof CreatePetSchema>;

// ── Cita ─────────────────────────────────────────────────────
export const CreateAppointmentSchema = z.object({
  mascotaId: z.string().uuid(),
  veterinarioId: z.string().uuid(),
  fechaHora: z.string().datetime(),
  duracionMin: z.number().int().min(15).max(240).default(30),
  motivo: z.string().min(3).max(300),
});
export type CreateAppointmentDto = z.infer<typeof CreateAppointmentSchema>;

// ── Consulta ─────────────────────────────────────────────────
export const CreateConsultationSchema = z.object({
  citaId: z.string().uuid(),
  pesoKg: z.number().positive().optional(),
  temperatura: z.number().min(30).max(45).optional(),
  diagnostico: z.string().min(3).max(2000),
  tratamiento: z.string().max(2000).optional(),
  notas: z.string().max(2000).optional(),
});
export type CreateConsultationDto = z.infer<typeof CreateConsultationSchema>;

// ── Producto ─────────────────────────────────────────────────
export const CreateProductSchema = z.object({
  nombre: z.string().min(2).max(150),
  codigo: z.string().max(50).optional(),
  categoria: z.enum(['MEDICATION', 'FOOD', 'SUPPLY', 'EQUIPMENT', 'OTHER']),
  unidad: z.string().max(30).default('unidad'),
  stockMinimo: z.number().int().min(0).default(0),
  stockMaximo: z.number().int().min(0).optional(),
  precioCosto: z.number().min(0).optional(),
  precioVenta: z.number().min(0).optional(),
  fechaVencimiento: z.string().datetime().optional(),
  proveedorId: z.string().uuid().optional(),
});
export type CreateProductDto = z.infer<typeof CreateProductSchema>;

// ── Movimiento de stock ──────────────────────────────────────
export const CreateStockMovementSchema = z.object({
  productoId: z.string().uuid(),
  tipo: z.enum(['IN', 'OUT', 'ADJUSTMENT']),
  cantidad: z.number().int().positive(),
  referenciaId: z.string().uuid().optional(),
  notas: z.string().max(300).optional(),
});
export type CreateStockMovementDto = z.infer<typeof CreateStockMovementSchema>;

// ── Paginación ───────────────────────────────────────────────
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});
export type PaginationDto = z.infer<typeof PaginationSchema>;
