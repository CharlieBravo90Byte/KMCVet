import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { join } from 'path';
import { existsSync, unlinkSync } from 'fs';

@Injectable()
export class ConsultasService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Listar historial clínico por mascota ──────────────────
  async findByMascota(tenantId: string, mascotaId: string) {
    const consultas = await this.prisma.consultation.findMany({
      where: { tenantId, mascotaId },
      include: {
        veterinario: { select: { nombre: true } },
        archivos: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return consultas.map(c => this.mapConsulta(c));
  }

  // ── Crear consulta ────────────────────────────────────────
  async create(tenantId: string, dto: any) {
    const pet = await this.prisma.pet.findFirst({ where: { id: dto.mascotaId, tenantId } });
    if (!pet) throw new NotFoundException('Mascota no encontrada');

    let vetId: string | null = null;
    if (dto.veterinarioId) {
      const vet = await this.prisma.user.findFirst({ where: { id: dto.veterinarioId, tenantId } });
      if (vet) vetId = vet.id;
    }

    const consulta = await this.prisma.consultation.create({
      data: {
        tenantId,
        mascotaId: dto.mascotaId,
        citaId: dto.citaId ?? null,
        veterinarioId: vetId,
        pesoKg: dto.pesoKg ? parseFloat(dto.pesoKg) : null,
        temperatura: dto.temperatura ? parseFloat(dto.temperatura) : null,
        diagnostico: dto.diagnostico ?? '',
        tratamiento: dto.tratamiento ?? null,
        notas: dto.notas ?? null,
      },
      include: {
        veterinario: { select: { nombre: true } },
        archivos: true,
      },
    });
    return this.mapConsulta(consulta);
  }

  // ── Actualizar consulta ───────────────────────────────────
  async update(tenantId: string, id: string, dto: any) {
    const consulta = await this.prisma.consultation.findFirst({ where: { id, tenantId } });
    if (!consulta) throw new NotFoundException('Consulta no encontrada');

    const updated = await this.prisma.consultation.update({
      where: { id },
      data: {
        pesoKg: dto.pesoKg !== undefined ? parseFloat(dto.pesoKg) : consulta.pesoKg,
        temperatura: dto.temperatura !== undefined ? parseFloat(dto.temperatura) : consulta.temperatura,
        diagnostico: dto.diagnostico ?? consulta.diagnostico,
        tratamiento: dto.tratamiento ?? consulta.tratamiento,
        notas: dto.notas ?? consulta.notas,
      },
      include: {
        veterinario: { select: { nombre: true } },
        archivos: true,
      },
    });
    return this.mapConsulta(updated);
  }

  // ── Eliminar consulta ─────────────────────────────────────
  async remove(tenantId: string, id: string) {
    const consulta = await this.prisma.consultation.findFirst({
      where: { id, tenantId },
      include: { archivos: true },
    });
    if (!consulta) throw new NotFoundException('Consulta no encontrada');

    // Borrar archivos físicos
    for (const a of consulta.archivos) {
      const filePath = join(process.cwd(), 'uploads', a.url.replace('/uploads/', ''));
      if (existsSync(filePath)) unlinkSync(filePath);
    }

    await this.prisma.consultation.delete({ where: { id } });
    return { ok: true };
  }

  // ── Adjuntar archivo ──────────────────────────────────────
  async addArchivo(tenantId: string, consultaId: string, file: Express.Multer.File) {
    const consulta = await this.prisma.consultation.findFirst({ where: { id: consultaId, tenantId } });
    if (!consulta) throw new NotFoundException('Consulta no encontrada');

    const archivo = await this.prisma.consultationFile.create({
      data: {
        consultaId,
        nombre: file.originalname,
        url: `/uploads/${file.filename}`,
        mimetype: file.mimetype,
      },
    });
    return archivo;
  }

  // ── Eliminar archivo ──────────────────────────────────────
  async removeArchivo(tenantId: string, archivoId: string) {
    const archivo = await this.prisma.consultationFile.findFirst({
      where: { id: archivoId, consulta: { tenantId } },
    });
    if (!archivo) throw new NotFoundException('Archivo no encontrado');

    const filePath = join(process.cwd(), 'uploads', archivo.url.replace('/uploads/', ''));
    if (existsSync(filePath)) unlinkSync(filePath);

    await this.prisma.consultationFile.delete({ where: { id: archivoId } });
    return { ok: true };
  }

  // ── Helpers ───────────────────────────────────────────────
  private mapConsulta(c: any) {
    return {
      id: c.id,
      mascotaId: c.mascotaId,
      citaId: c.citaId,
      veterinario: c.veterinario?.nombre ?? null,
      veterinarioId: c.veterinarioId,
      pesoKg: c.pesoKg,
      temperatura: c.temperatura,
      diagnostico: c.diagnostico,
      tratamiento: c.tratamiento,
      notas: c.notas,
      archivos: (c.archivos ?? []).map((a: any) => ({
        id: a.id,
        nombre: a.nombre,
        url: a.url,
        mimetype: a.mimetype,
        createdAt: a.createdAt,
      })),
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }
}
