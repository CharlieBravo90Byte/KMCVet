import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class HospitalService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Listar hospedajes ─────────────────────────────────────
  async getAll(tenantId: string, estado?: string) {
    return this.prisma.hospedaje.findMany({
      where: {
        tenantId,
        ...(estado ? { estado } : {}),
      },
      include: {
        pet:         { select: { id: true, nombre: true, especie: true, raza: true } },
        propietario: { select: { id: true, nombre: true, telefono: true } },
      },
      orderBy: { fechaEntrada: 'desc' },
    });
  }

  // ── Obtener uno ───────────────────────────────────────────
  async getById(tenantId: string, id: string) {
    const h = await this.prisma.hospedaje.findFirst({
      where: { id, tenantId },
      include: {
        pet:         { select: { id: true, nombre: true, especie: true, raza: true, alergias: true, condicionesPrevias: true } },
        propietario: { select: { id: true, nombre: true, telefono: true, email: true } },
      },
    });
    if (!h) throw new NotFoundException('Hospedaje no encontrado');
    return h;
  }

  // ── Crear check-in ────────────────────────────────────────
  async crear(tenantId: string, dto: {
    petId: string;
    propietarioId: string;
    fechaEntrada: string;
    fechaSalidaEst?: string;
    tipoAlojamiento?: string;
    dieta?: string;
    cuidados?: string;
    observaciones?: string;
    precioPorNoche?: number;
  }) {
    return this.prisma.hospedaje.create({
      data: {
        tenantId,
        petId:          dto.petId,
        propietarioId:  dto.propietarioId,
        fechaEntrada:   new Date(dto.fechaEntrada),
        fechaSalidaEst: dto.fechaSalidaEst ? new Date(dto.fechaSalidaEst) : undefined,
        tipoAlojamiento: dto.tipoAlojamiento,
        dieta:          dto.dieta,
        cuidados:       dto.cuidados,
        observaciones:  dto.observaciones,
        precioPorNoche: dto.precioPorNoche,
        estado:         'activo',
      },
      include: {
        pet:         { select: { id: true, nombre: true, especie: true } },
        propietario: { select: { id: true, nombre: true, telefono: true } },
      },
    });
  }

  // ── Actualizar notas / datos ──────────────────────────────
  async actualizar(tenantId: string, id: string, dto: {
    notas?: string;
    dieta?: string;
    cuidados?: string;
    precioPorNoche?: number;
    tipoAlojamiento?: string;
  }) {
    const h = await this.prisma.hospedaje.findFirst({ where: { id, tenantId } });
    if (!h) throw new NotFoundException('Hospedaje no encontrado');
    return this.prisma.hospedaje.update({ where: { id }, data: dto });
  }

  // ── Check-out ─────────────────────────────────────────────
  async checkout(tenantId: string, id: string, fechaSalidaReal?: string) {
    const h = await this.prisma.hospedaje.findFirst({ where: { id, tenantId } });
    if (!h) throw new NotFoundException('Hospedaje no encontrado');
    return this.prisma.hospedaje.update({
      where: { id },
      data: {
        estado:          'finalizado',
        fechaSalidaReal: fechaSalidaReal ? new Date(fechaSalidaReal) : new Date(),
      },
    });
  }

  // ── Estadísticas rápidas ──────────────────────────────────
  async getStats(tenantId: string) {
    const [activos, total] = await Promise.all([
      this.prisma.hospedaje.count({ where: { tenantId, estado: 'activo' } }),
      this.prisma.hospedaje.count({ where: { tenantId } }),
    ]);
    return { activos, total };
  }
}
