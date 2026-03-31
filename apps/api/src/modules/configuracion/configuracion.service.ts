import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class ConfiguracionService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────
  // DOCTORES (usuarios con rol VET)
  // ─────────────────────────────────────────────────────────

  async findDoctores(tenantId: string) {
    const vets = await this.prisma.user.findMany({
      where: { tenantId, rol: 'VET' },
      orderBy: { nombre: 'asc' },
    });
    return vets.map(v => ({
      id: v.id,
      nombre: v.nombre,
      email: v.email,
      telefono: (v as any).telefono ?? null,
      activo: v.activo,
      color: this.colorForId(v.id),
    }));
  }

  async createDoctor(tenantId: string, dto: any) {
    const existing = await this.prisma.user.findFirst({
      where: { tenantId, email: dto.email },
    });
    if (existing) throw new ConflictException('Ya existe un usuario con ese email');

    const hash = await bcrypt.hash(dto.password ?? 'Vet1234!', 12);
    const user = await this.prisma.user.create({
      data: {
        tenantId,
        nombre: dto.nombre,
        email: dto.email,
        passwordHash: hash,
        ...(dto.telefono ? { telefono: dto.telefono } : {}),
        rol: 'VET',
        activo: true,
      } as any,
    });
    return { id: user.id, nombre: user.nombre, email: user.email, telefono: (user as any).telefono ?? null, activo: user.activo, color: this.colorForId(user.id) };
  }

  async updateDoctor(tenantId: string, id: string, dto: any) {
    const user = await this.prisma.user.findFirst({ where: { id, tenantId, rol: 'VET' } });
    if (!user) throw new NotFoundException('Doctor no encontrado');

    const data: any = {};
    if (dto.nombre !== undefined) data.nombre = dto.nombre;
    if (dto.email  !== undefined) data.email  = dto.email;
    if (dto.telefono !== undefined) data.telefono = dto.telefono;
    if (dto.activo !== undefined) data.activo = dto.activo;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 12);

    const updated = await this.prisma.user.update({ where: { id }, data });
    return { id: updated.id, nombre: updated.nombre, email: updated.email, telefono: (updated as any).telefono ?? null, activo: updated.activo, color: this.colorForId(updated.id) };
  }

  async removeDoctor(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({ where: { id, tenantId, rol: 'VET' } });
    if (!user) throw new NotFoundException('Doctor no encontrado');
    await this.prisma.user.update({ where: { id }, data: { activo: false } });
    return { ok: true };
  }

  async hardDeleteDoctor(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({ where: { id, tenantId, rol: 'VET' } });
    if (!user) throw new NotFoundException('Doctor no encontrado');
    await this.prisma.user.delete({ where: { id } });
    return { ok: true };
  }

  // ─────────────────────────────────────────────────────────
  // TIPOS DE ATENCIÓN (motivos de cita)
  // ─────────────────────────────────────────────────────────

  async findTipos(tenantId: string) {
    const tipos = await this.prisma.appointmentType.findMany({
      where: { tenantId },
      orderBy: { orden: 'asc' },
    });

    // Si no hay tipos configurados, devolver los defaults
    if (tipos.length === 0) {
      return this.getDefaults();
    }
    return tipos;
  }

  async createTipo(tenantId: string, dto: any) {
    const last = await this.prisma.appointmentType.findFirst({
      where: { tenantId },
      orderBy: { orden: 'desc' },
    });
    const tipo = await this.prisma.appointmentType.create({
      data: {
        tenantId,
        label: dto.label,
        activo: true,
        orden: (last?.orden ?? 0) + 1,
      },
    });
    return tipo;
  }

  async updateTipo(tenantId: string, id: string, dto: any) {
    const tipo = await this.prisma.appointmentType.findFirst({ where: { id, tenantId } });
    if (!tipo) throw new NotFoundException('Tipo de atención no encontrado');
    const updated = await this.prisma.appointmentType.update({
      where: { id },
      data: {
        label: dto.label ?? tipo.label,
        activo: dto.activo !== undefined ? dto.activo : tipo.activo,
        orden: dto.orden ?? tipo.orden,
      },
    });
    return updated;
  }

  async removeTipo(tenantId: string, id: string) {
    const tipo = await this.prisma.appointmentType.findFirst({ where: { id, tenantId } });
    if (!tipo) throw new NotFoundException('Tipo de atención no encontrado');
    await this.prisma.appointmentType.delete({ where: { id } });
    return { ok: true };
  }

  // ─── Seed de defaults si no hay ninguno en la BD ─────────
  async seedTiposDefaults(tenantId: string) {
    const count = await this.prisma.appointmentType.count({ where: { tenantId } });
    if (count > 0) return;
    const defaults = this.getDefaults();
    await this.prisma.appointmentType.createMany({
      data: defaults.map(d => ({ tenantId, label: d.label, orden: d.orden })),
    });
  }

  private getDefaults() {
    return [
      { id: 'default-1', label: 'Control anual',         activo: true, orden: 0 },
      { id: 'default-2', label: 'Vacunación',             activo: true, orden: 1 },
      { id: 'default-3', label: 'Desparasitación',        activo: true, orden: 2 },
      { id: 'default-4', label: 'Cirugía programada',     activo: true, orden: 3 },
      { id: 'default-5', label: 'Urgencia / Emergencia',  activo: true, orden: 4 },
      { id: 'default-6', label: 'Revisión post-op',       activo: true, orden: 5 },
      { id: 'default-7', label: 'Limpieza dental',        activo: true, orden: 6 },
      { id: 'default-8', label: 'Dermatología',           activo: true, orden: 7 },
      { id: 'default-9', label: 'Otro motivo…',           activo: true, orden: 8 },
    ];
  }

  // ─── Color determinista por ID ────────────────────────────
  private colorForId(id: string): string {
    const colors = ['emerald', 'teal', 'cyan', 'blue', 'violet', 'rose', 'amber', 'orange'];
    const sum = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return colors[sum % colors.length];
  }
}
