import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { join } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';

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
    let tipos = await this.prisma.appointmentType.findMany({
      where: { tenantId },
      orderBy: { orden: 'asc' },
    });

    // Si no hay tipos en BD, sembrar defaults para que tengan UUID real
    if (tipos.length === 0) {
      await this.seedTiposDefaults(tenantId);
      tipos = await this.prisma.appointmentType.findMany({
        where: { tenantId },
        orderBy: { orden: 'asc' },
      });
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
        precio: dto.precio !== undefined ? Number(dto.precio) : null,
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
        precio: dto.precio !== undefined ? (dto.precio === null ? null : Number(dto.precio)) : tipo.precio,
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

  // ─────────────────────────────────────────────────────────
  // CLÍNICA (datos de la veterinaria)
  // ─────────────────────────────────────────────────────────

  async findClinica(tenantId: string) {
    const t = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!t) throw new NotFoundException('Clínica no encontrada');
    return {
      nombre:          t.nombre,
      nombreEmpresa:   (t as any).nombreEmpresa   ?? null,
      rutEmpresa:      (t as any).rutEmpresa      ?? null,
      giroClinica:     (t as any).giroClinica     ?? null,
      direccionClinica:(t as any).direccionClinica ?? null,
      comunaClinica:   (t as any).comunaClinica   ?? null,
      ciudadClinica:   (t as any).ciudadClinica   ?? null,
      eslogan:         (t as any).eslogan         ?? null,
      resolucionSII:   (t as any).resolucionSII   ?? null,
      dteTipo:         (t as any).dteTipo         ?? '39',
      logoUrl:         t.logoUrl                  ?? null,
      plantillaBoletaUrl:      (t as any).plantillaBoletaUrl      ?? null,
      plantillaFacturaUrl:     (t as any).plantillaFacturaUrl     ?? null,
      plantillaNotaCreditoUrl: (t as any).plantillaNotaCreditoUrl ?? null,
      emailClinica:    (t as any).emailClinica    ?? null,
      telefonos:       (t as any).telefonos       ?? null,
    };
  }

  async updateClinica(tenantId: string, dto: any) {
    const data: any = {};
    if (dto.nombre             !== undefined) data.nombre             = dto.nombre;
    if (dto.nombreEmpresa      !== undefined) data.nombreEmpresa      = dto.nombreEmpresa;
    if (dto.rutEmpresa         !== undefined) data.rutEmpresa         = dto.rutEmpresa;
    if (dto.giroClinica        !== undefined) data.giroClinica        = dto.giroClinica;
    if (dto.direccionClinica   !== undefined) data.direccionClinica   = dto.direccionClinica;
    if (dto.comunaClinica      !== undefined) data.comunaClinica      = dto.comunaClinica;
    if (dto.ciudadClinica      !== undefined) data.ciudadClinica      = dto.ciudadClinica;
    if (dto.eslogan            !== undefined) data.eslogan            = dto.eslogan;
    if (dto.resolucionSII      !== undefined) data.resolucionSII      = dto.resolucionSII;
    if (dto.dteTipo            !== undefined) data.dteTipo            = dto.dteTipo;
    if (dto.logoUrl            !== undefined) data.logoUrl            = dto.logoUrl;
    if (dto.emailClinica       !== undefined) data.emailClinica       = dto.emailClinica;
    if (dto.telefonos          !== undefined) data.telefonos          = dto.telefonos;
    if (dto.plantillaBoletaUrl !== undefined)         data.plantillaBoletaUrl         = dto.plantillaBoletaUrl;
    if (dto.plantillaFacturaUrl !== undefined)        data.plantillaFacturaUrl        = dto.plantillaFacturaUrl;
    if (dto.plantillaNotaCreditoUrl !== undefined)    data.plantillaNotaCreditoUrl    = dto.plantillaNotaCreditoUrl;

    const updated = await this.prisma.tenant.update({ where: { id: tenantId }, data });
    return {
      nombre:          updated.nombre,
      nombreEmpresa:   (updated as any).nombreEmpresa   ?? null,
      rutEmpresa:      (updated as any).rutEmpresa      ?? null,
      giroClinica:     (updated as any).giroClinica     ?? null,
      direccionClinica:(updated as any).direccionClinica ?? null,
      comunaClinica:   (updated as any).comunaClinica   ?? null,
      ciudadClinica:   (updated as any).ciudadClinica   ?? null,
      eslogan:         (updated as any).eslogan         ?? null,
      resolucionSII:   (updated as any).resolucionSII   ?? null,
      dteTipo:         (updated as any).dteTipo         ?? '39',
      logoUrl:         updated.logoUrl                  ?? null,
      plantillaBoletaUrl:      (updated as any).plantillaBoletaUrl      ?? null,
      plantillaFacturaUrl:     (updated as any).plantillaFacturaUrl     ?? null,
      plantillaNotaCreditoUrl: (updated as any).plantillaNotaCreditoUrl ?? null,
      emailClinica:    (updated as any).emailClinica    ?? null,
      telefonos:       (updated as any).telefonos       ?? null,
    };
  }

  async uploadLogo(tenantId: string, file: Express.Multer.File): Promise<{ logoUrl: string }> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (tenant?.logoUrl && tenant.logoUrl.startsWith('/uploads/logos/')) {
      const oldPath = join(process.cwd(), 'uploads', 'logos', tenant.logoUrl.replace('/uploads/logos/', ''));
      if (existsSync(oldPath)) { try { unlinkSync(oldPath); } catch {} }
    }
    const logoUrl = `/uploads/logos/${file.filename}`;
    await this.prisma.tenant.update({ where: { id: tenantId }, data: { logoUrl } });
    return { logoUrl };
  }

  async uploadPlantilla(tenantId: string, tipo: string, file: Express.Multer.File): Promise<Record<string, string>> {
    const fieldMap: Record<string, string> = {
      boleta:       'plantillaBoletaUrl',
      factura:      'plantillaFacturaUrl',
      nota_credito: 'plantillaNotaCreditoUrl',
    };
    const field = fieldMap[tipo] ?? 'plantillaBoletaUrl';

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const prev = (tenant as any)?.[field];
    if (prev && prev.startsWith('/uploads/plantillas/')) {
      const oldPath = join(process.cwd(), 'uploads', 'plantillas', prev.replace('/uploads/plantillas/', ''));
      if (existsSync(oldPath)) { try { unlinkSync(oldPath); } catch {} }
    }
    const url = `/uploads/plantillas/${file.filename}`;
    await this.prisma.tenant.update({ where: { id: tenantId }, data: { [field]: url } as any });
    return { [field]: url };
  }

  // ─────────────────────────────────────────────────────────
  // FOLIOS (rangos de numeración de documentos tributarios)
  // ─────────────────────────────────────────────────────────

  async findFolios(tenantId: string) {
    return this.prisma.folioRange.findMany({
      where: { tenantId },
      orderBy: [{ tipo: 'asc' }, { desde: 'asc' }],
    });
  }

  async createFolio(tenantId: string, dto: { tipo: string; desde: number; hasta: number; fechaVencimiento?: string | null }) {
    if (dto.desde > dto.hasta) {
      throw new ConflictException('El número inicial debe ser menor o igual al final');
    }
    return this.prisma.folioRange.create({
      data: {
        tenantId,
        tipo: dto.tipo,
        desde: dto.desde,
        hasta: dto.hasta,
        actual: dto.desde,
        activo: true,
        fechaVencimiento: dto.fechaVencimiento ? new Date(dto.fechaVencimiento) : null,
      },
    });
  }

  async deleteFolio(tenantId: string, id: string) {
    const f = await this.prisma.folioRange.findFirst({ where: { id, tenantId } });
    if (!f) throw new NotFoundException('Folio no encontrado');
    await this.prisma.folioRange.delete({ where: { id } });
    return { ok: true };
  }

  async getFolioStatus(tenantId: string) {
    const tipos = ['boleta', 'factura', 'nota_credito'];
    const result: Record<string, any> = {};
    for (const tipo of tipos) {
      const activo = await this.prisma.folioRange.findFirst({
        where: { tenantId, tipo, activo: true },
        orderBy: { desde: 'asc' },
      });
      if (!activo) {
        result[tipo] = { disponibles: 0, siguiente: null, estado: 'sin_folios' };
      } else if (activo.actual > activo.hasta) {
        result[tipo] = { disponibles: 0, siguiente: null, estado: 'agotado' };
      } else {
        result[tipo] = {
          disponibles: activo.hasta - activo.actual + 1,
          siguiente: activo.actual,
          estado: 'ok',
        };
      }
    }
    return result;
  }
}
