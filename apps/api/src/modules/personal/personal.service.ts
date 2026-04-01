import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PersonalService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Staff ────────────────────────────────────────────────────
  async findAllStaff(tenantId: string) {
    return this.prisma.staff.findMany({
      where: { tenantId },
      orderBy: [{ activo: 'desc' }, { nombre: 'asc' }],
    });
  }

  async createStaff(tenantId: string, dto: any) {
    return this.prisma.staff.create({
      data: {
        tenantId,
        nombre: dto.nombre,
        cargo: dto.cargo ?? 'OTRO',
        email: dto.email ?? null,
        telefono: dto.telefono ?? null,
        notas: dto.notas ?? null,
        color: dto.color ?? 'emerald',
        activo: true,
      },
    });
  }

  async updateStaff(tenantId: string, id: string, dto: any) {
    const exists = await this.prisma.staff.findFirst({ where: { id, tenantId } });
    if (!exists) throw new NotFoundException('Personal no encontrado');
    return this.prisma.staff.update({
      where: { id },
      data: {
        nombre:   dto.nombre   !== undefined ? dto.nombre   : undefined,
        cargo:    dto.cargo    !== undefined ? dto.cargo    : undefined,
        email:    dto.email    !== undefined ? dto.email    : undefined,
        telefono: dto.telefono !== undefined ? dto.telefono : undefined,
        notas:    dto.notas    !== undefined ? dto.notas    : undefined,
        color:    dto.color    !== undefined ? dto.color    : undefined,
        activo:   dto.activo   !== undefined ? dto.activo   : undefined,
      },
    });
  }

  async deleteStaff(tenantId: string, id: string) {
    const exists = await this.prisma.staff.findFirst({ where: { id, tenantId } });
    if (!exists) throw new NotFoundException('Personal no encontrado');
    await this.prisma.turno.deleteMany({ where: { staffId: id } });
    return this.prisma.staff.delete({ where: { id } });
  }

  // ── Turnos ───────────────────────────────────────────────────
  async findTurnos(tenantId: string, desde: string, hasta: string) {
    return this.prisma.turno.findMany({
      where: {
        tenantId,
        fecha: { gte: desde, lte: hasta },
      },
      include: { staff: { select: { id: true, nombre: true, cargo: true, color: true } } },
      orderBy: [{ fecha: 'asc' }],
    });
  }

  async setTurno(tenantId: string, staffId: string, fecha: string, tipo: string, notas?: string) {
    const staff = await this.prisma.staff.findFirst({ where: { id: staffId, tenantId } });
    if (!staff) throw new NotFoundException('Personal no encontrado');

    if (tipo === 'BORRAR') {
      await this.prisma.turno.deleteMany({ where: { staffId, fecha } });
      return { deleted: true };
    }

    return this.prisma.turno.upsert({
      where: { staffId_fecha: { staffId, fecha } },
      create: { id: require('crypto').randomUUID(), staffId, tenantId, fecha, tipo, notas: notas ?? null },
      update: { tipo, notas: notas ?? null },
    });
  }
}
