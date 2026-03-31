export type UserRole = 'ADMIN' | 'VET' | 'RECEPTIONIST' | 'INVENTORY';
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type StockMovementType = 'IN' | 'OUT' | 'ADJUSTMENT';
export type ProductCategory = 'MEDICATION' | 'FOOD' | 'SUPPLY' | 'EQUIPMENT' | 'OTHER';
export type PetSpecies = 'DOG' | 'CAT' | 'BIRD' | 'RABBIT' | 'REPTILE' | 'OTHER';
export type PetSex = 'MALE' | 'FEMALE' | 'UNKNOWN';
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export interface ApiResponse<T = void> {
    success: boolean;
    data?: T;
    message?: string;
    errors?: Record<string, string[]>;
}
export interface JwtPayload {
    sub: string;
    tenantId: string;
    role: UserRole;
    email: string;
}
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
//# sourceMappingURL=index.d.ts.map