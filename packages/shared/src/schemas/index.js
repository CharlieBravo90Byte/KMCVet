"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaginationSchema = exports.CreateStockMovementSchema = exports.CreateProductSchema = exports.CreateConsultationSchema = exports.CreateAppointmentSchema = exports.CreatePetSchema = exports.CreateOwnerSchema = exports.LoginSchema = void 0;
const zod_1 = require("zod");
// ── Auth ─────────────────────────────────────────────────────
exports.LoginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Email inválido'),
    password: zod_1.z.string().min(8, 'Mínimo 8 caracteres'),
});
// ── Propietario ──────────────────────────────────────────────
exports.CreateOwnerSchema = zod_1.z.object({
    nombre: zod_1.z.string().min(2).max(120),
    documento: zod_1.z.string().min(5).max(20),
    telefono: zod_1.z.string().min(7).max(20),
    email: zod_1.z.string().email().optional().or(zod_1.z.literal('')),
    direccion: zod_1.z.string().max(200).optional(),
});
// ── Mascota ──────────────────────────────────────────────────
exports.CreatePetSchema = zod_1.z.object({
    nombre: zod_1.z.string().min(1).max(80),
    especie: zod_1.z.enum(['DOG', 'CAT', 'BIRD', 'RABBIT', 'REPTILE', 'OTHER']),
    raza: zod_1.z.string().max(80).optional(),
    sexo: zod_1.z.enum(['MALE', 'FEMALE', 'UNKNOWN']).default('UNKNOWN'),
    fechaNacimiento: zod_1.z.string().datetime().optional(),
    color: zod_1.z.string().max(50).optional(),
    microchip: zod_1.z.string().max(50).optional(),
    alergias: zod_1.z.string().max(500).optional(),
    condicionesPrevias: zod_1.z.string().max(500).optional(),
    propietarioId: zod_1.z.string().uuid(),
});
// ── Cita ─────────────────────────────────────────────────────
exports.CreateAppointmentSchema = zod_1.z.object({
    mascotaId: zod_1.z.string().uuid(),
    veterinarioId: zod_1.z.string().uuid(),
    fechaHora: zod_1.z.string().datetime(),
    duracionMin: zod_1.z.number().int().min(15).max(240).default(30),
    motivo: zod_1.z.string().min(3).max(300),
});
// ── Consulta ─────────────────────────────────────────────────
exports.CreateConsultationSchema = zod_1.z.object({
    citaId: zod_1.z.string().uuid(),
    pesoKg: zod_1.z.number().positive().optional(),
    temperatura: zod_1.z.number().min(30).max(45).optional(),
    diagnostico: zod_1.z.string().min(3).max(2000),
    tratamiento: zod_1.z.string().max(2000).optional(),
    notas: zod_1.z.string().max(2000).optional(),
});
// ── Producto ─────────────────────────────────────────────────
exports.CreateProductSchema = zod_1.z.object({
    nombre: zod_1.z.string().min(2).max(150),
    codigo: zod_1.z.string().max(50).optional(),
    categoria: zod_1.z.enum(['MEDICATION', 'FOOD', 'SUPPLY', 'EQUIPMENT', 'OTHER']),
    unidad: zod_1.z.string().max(30).default('unidad'),
    stockMinimo: zod_1.z.number().int().min(0).default(0),
    stockMaximo: zod_1.z.number().int().min(0).optional(),
    precioCosto: zod_1.z.number().min(0).optional(),
    precioVenta: zod_1.z.number().min(0).optional(),
    fechaVencimiento: zod_1.z.string().datetime().optional(),
    proveedorId: zod_1.z.string().uuid().optional(),
});
// ── Movimiento de stock ──────────────────────────────────────
exports.CreateStockMovementSchema = zod_1.z.object({
    productoId: zod_1.z.string().uuid(),
    tipo: zod_1.z.enum(['IN', 'OUT', 'ADJUSTMENT']),
    cantidad: zod_1.z.number().int().positive(),
    referenciaId: zod_1.z.string().uuid().optional(),
    notas: zod_1.z.string().max(300).optional(),
});
// ── Paginación ───────────────────────────────────────────────
exports.PaginationSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    search: zod_1.z.string().optional(),
});
