import { z } from 'zod';
export declare const LoginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export type LoginDto = z.infer<typeof LoginSchema>;
export declare const CreateOwnerSchema: z.ZodObject<{
    nombre: z.ZodString;
    documento: z.ZodString;
    telefono: z.ZodString;
    email: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    direccion: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    nombre: string;
    documento: string;
    telefono: string;
    email?: string | undefined;
    direccion?: string | undefined;
}, {
    nombre: string;
    documento: string;
    telefono: string;
    email?: string | undefined;
    direccion?: string | undefined;
}>;
export type CreateOwnerDto = z.infer<typeof CreateOwnerSchema>;
export declare const CreatePetSchema: z.ZodObject<{
    nombre: z.ZodString;
    especie: z.ZodEnum<["DOG", "CAT", "BIRD", "RABBIT", "REPTILE", "OTHER"]>;
    raza: z.ZodOptional<z.ZodString>;
    sexo: z.ZodDefault<z.ZodEnum<["MALE", "FEMALE", "UNKNOWN"]>>;
    fechaNacimiento: z.ZodOptional<z.ZodString>;
    color: z.ZodOptional<z.ZodString>;
    microchip: z.ZodOptional<z.ZodString>;
    alergias: z.ZodOptional<z.ZodString>;
    condicionesPrevias: z.ZodOptional<z.ZodString>;
    propietarioId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    nombre: string;
    especie: "OTHER" | "DOG" | "CAT" | "BIRD" | "RABBIT" | "REPTILE";
    sexo: "MALE" | "FEMALE" | "UNKNOWN";
    propietarioId: string;
    raza?: string | undefined;
    fechaNacimiento?: string | undefined;
    color?: string | undefined;
    microchip?: string | undefined;
    alergias?: string | undefined;
    condicionesPrevias?: string | undefined;
}, {
    nombre: string;
    especie: "OTHER" | "DOG" | "CAT" | "BIRD" | "RABBIT" | "REPTILE";
    propietarioId: string;
    raza?: string | undefined;
    sexo?: "MALE" | "FEMALE" | "UNKNOWN" | undefined;
    fechaNacimiento?: string | undefined;
    color?: string | undefined;
    microchip?: string | undefined;
    alergias?: string | undefined;
    condicionesPrevias?: string | undefined;
}>;
export type CreatePetDto = z.infer<typeof CreatePetSchema>;
export declare const CreateAppointmentSchema: z.ZodObject<{
    mascotaId: z.ZodString;
    veterinarioId: z.ZodString;
    fechaHora: z.ZodString;
    duracionMin: z.ZodDefault<z.ZodNumber>;
    motivo: z.ZodString;
}, "strip", z.ZodTypeAny, {
    mascotaId: string;
    veterinarioId: string;
    fechaHora: string;
    duracionMin: number;
    motivo: string;
}, {
    mascotaId: string;
    veterinarioId: string;
    fechaHora: string;
    motivo: string;
    duracionMin?: number | undefined;
}>;
export type CreateAppointmentDto = z.infer<typeof CreateAppointmentSchema>;
export declare const CreateConsultationSchema: z.ZodObject<{
    citaId: z.ZodString;
    pesoKg: z.ZodOptional<z.ZodNumber>;
    temperatura: z.ZodOptional<z.ZodNumber>;
    diagnostico: z.ZodString;
    tratamiento: z.ZodOptional<z.ZodString>;
    notas: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    citaId: string;
    diagnostico: string;
    pesoKg?: number | undefined;
    temperatura?: number | undefined;
    tratamiento?: string | undefined;
    notas?: string | undefined;
}, {
    citaId: string;
    diagnostico: string;
    pesoKg?: number | undefined;
    temperatura?: number | undefined;
    tratamiento?: string | undefined;
    notas?: string | undefined;
}>;
export type CreateConsultationDto = z.infer<typeof CreateConsultationSchema>;
export declare const CreateProductSchema: z.ZodObject<{
    nombre: z.ZodString;
    codigo: z.ZodOptional<z.ZodString>;
    categoria: z.ZodEnum<["MEDICATION", "FOOD", "SUPPLY", "EQUIPMENT", "OTHER"]>;
    unidad: z.ZodDefault<z.ZodString>;
    stockMinimo: z.ZodDefault<z.ZodNumber>;
    stockMaximo: z.ZodOptional<z.ZodNumber>;
    precioCosto: z.ZodOptional<z.ZodNumber>;
    precioVenta: z.ZodOptional<z.ZodNumber>;
    fechaVencimiento: z.ZodOptional<z.ZodString>;
    proveedorId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    nombre: string;
    categoria: "MEDICATION" | "FOOD" | "SUPPLY" | "EQUIPMENT" | "OTHER";
    unidad: string;
    stockMinimo: number;
    codigo?: string | undefined;
    stockMaximo?: number | undefined;
    precioCosto?: number | undefined;
    precioVenta?: number | undefined;
    fechaVencimiento?: string | undefined;
    proveedorId?: string | undefined;
}, {
    nombre: string;
    categoria: "MEDICATION" | "FOOD" | "SUPPLY" | "EQUIPMENT" | "OTHER";
    codigo?: string | undefined;
    unidad?: string | undefined;
    stockMinimo?: number | undefined;
    stockMaximo?: number | undefined;
    precioCosto?: number | undefined;
    precioVenta?: number | undefined;
    fechaVencimiento?: string | undefined;
    proveedorId?: string | undefined;
}>;
export type CreateProductDto = z.infer<typeof CreateProductSchema>;
export declare const CreateStockMovementSchema: z.ZodObject<{
    productoId: z.ZodString;
    tipo: z.ZodEnum<["IN", "OUT", "ADJUSTMENT"]>;
    cantidad: z.ZodNumber;
    referenciaId: z.ZodOptional<z.ZodString>;
    notas: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    productoId: string;
    tipo: "IN" | "OUT" | "ADJUSTMENT";
    cantidad: number;
    notas?: string | undefined;
    referenciaId?: string | undefined;
}, {
    productoId: string;
    tipo: "IN" | "OUT" | "ADJUSTMENT";
    cantidad: number;
    notas?: string | undefined;
    referenciaId?: string | undefined;
}>;
export type CreateStockMovementDto = z.infer<typeof CreateStockMovementSchema>;
export declare const PaginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    search: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    search?: string | undefined;
}, {
    page?: number | undefined;
    limit?: number | undefined;
    search?: string | undefined;
}>;
export type PaginationDto = z.infer<typeof PaginationSchema>;
//# sourceMappingURL=index.d.ts.map