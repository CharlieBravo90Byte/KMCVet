import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MetasService {
  constructor(private readonly prisma: PrismaService) {}

  // GET /api/metas
  async getAll(tenantId: string) {
    return this.prisma.meta.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // GET /api/metas/activa?tipo=diaria|mensual
  async getActiva(tenantId: string, tipo: string) {
    return this.prisma.meta.findFirst({
      where: { tenantId, tipo, activa: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // POST /api/metas — crea/actualiza meta activa
  async upsert(tenantId: string, tipo: string, monto: number) {
    // desactiva las anteriores del mismo tipo
    await this.prisma.meta.updateMany({
      where: { tenantId, tipo, activa: true },
      data: { activa: false },
    });
    return this.prisma.meta.create({
      data: { tenantId, tipo, monto, activa: true },
    });
  }

  // DELETE /api/metas/:id
  async remove(tenantId: string, id: string) {
    return this.prisma.meta.deleteMany({ where: { id, tenantId } });
  }
}
