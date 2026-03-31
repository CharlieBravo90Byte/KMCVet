// ============================================================
// Tipos comunes compartidos entre web y api
// ============================================================

// ── Roles ────────────────────────────────────────────────────
export type UserRole = 'ADMIN' | 'VET' | 'RECEPTIONIST' | 'INVENTORY';

// ── Estado de cita ───────────────────────────────────────────
export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

// ── Tipos de movimiento de stock ─────────────────────────────
export type StockMovementType = 'IN' | 'OUT' | 'ADJUSTMENT';

// ── Categorías de producto ───────────────────────────────────
export type ProductCategory =
  | 'MEDICATION'
  | 'FOOD'
  | 'SUPPLY'
  | 'EQUIPMENT'
  | 'OTHER';

// ── Especie de mascota ───────────────────────────────────────
export type PetSpecies =
  | 'DOG'
  | 'CAT'
  | 'BIRD'
  | 'RABBIT'
  | 'REPTILE'
  | 'OTHER';

// ── Sexo de mascota ──────────────────────────────────────────
export type PetSex = 'MALE' | 'FEMALE' | 'UNKNOWN';

// ── Respuesta paginada genérica ──────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Respuesta API estándar ───────────────────────────────────
export interface ApiResponse<T = void> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

// ── JWT Payload ──────────────────────────────────────────────
export interface JwtPayload {
  sub: string;         // userId
  tenantId: string;
  role: UserRole;
  email: string;
}

// ── Config del tenant (white-label) ─────────────────────────
export interface TenantConfig {
  id: string;
  slug: string;
  nombre: string;
  logoUrl: string | null;
  colorPrimario: string;
  colorSecundario: string;
  moneda: string;
  timezone: string;
  modulos: string[];
}
