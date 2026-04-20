import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CajaService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Ventas del día ───────────────────────────────────────────
  async getVentasDia(tenantId: string, fechaDia: string) {
    // fechaDia: YYYY-MM-DD
    const desde = new Date(`${fechaDia}T00:00:00.000`);
    const hasta = new Date(`${fechaDia}T23:59:59.999`);
    const ventas = await this.prisma.sale.findMany({
      where: {
        tenantId,
        fecha: { gte: desde, lte: hasta },
        estado: 'COMPLETADA',
      },
      select: {
        id: true,
        fecha: true,
        total: true,
        tipoDoc: true,
        numeroDocumento: true,
        notas: true,
        usuario: { select: { nombre: true } },
        items: {
          select: { descripcion: true, cantidad: true, subtotal: true },
        },
      },
      orderBy: { fecha: 'desc' },
    });

    const totalVentas = ventas.reduce((s, v) => s + v.total, 0);
    return { ventas, totalVentas };
  }

  // ── Total ventas del mes ─────────────────────────────────────
  async getVentasTotalMes(tenantId: string, mes: string) {
    const [y, m] = mes.split('-').map(Number);
    const desde = new Date(y, m - 1, 1, 0, 0, 0);
    const hasta  = new Date(y, m, 0, 23, 59, 59);
    const agg = await this.prisma.sale.aggregate({
      where: { tenantId, fecha: { gte: desde, lte: hasta }, estado: 'COMPLETADA' },
      _sum: { total: true },
    });
    return { mes, totalMes: agg._sum.total ?? 0 };
  }

  // ── Último cierre (para obtener saldo anterior) ──────────────
  async getUltimoCierre(tenantId: string) {
    return this.prisma.cajaCierre.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Historial de cierres ─────────────────────────────────────
  async getHistorial(tenantId: string) {
    return this.prisma.cajaCierre.findMany({
      where: { tenantId },
      include: { usuario: { select: { nombre: true } } },
      orderBy: { createdAt: 'desc' },
      take: 90,
    });
  }

  // ── Registrar cierre de caja ─────────────────────────────────
  async registrarCierre(tenantId: string, usuarioId: string, dto: {
    fechaDia: string;
    saldoAnterior: number;
    totalEfectivo: number;
    totalTarjeta: number;
    totalTransferencia: number;
    observaciones?: string;
  }) {
    const { totalVentas } = await this.getVentasDia(tenantId, dto.fechaDia);
    const declarado = dto.totalEfectivo + dto.totalTarjeta + dto.totalTransferencia;
    const diferencia = declarado - totalVentas;

    return this.prisma.cajaCierre.create({
      data: {
        tenantId,
        usuarioId,
        fechaDia: dto.fechaDia,
        saldoAnterior: dto.saldoAnterior,
        totalEfectivo: dto.totalEfectivo,
        totalTarjeta: dto.totalTarjeta,
        totalTransferencia: dto.totalTransferencia,
        totalVentas,
        diferencia,
        observaciones: dto.observaciones ?? null,
      },
      include: { usuario: { select: { nombre: true } } },
    });
  }

  // ── Eliminar cierre ──────────────────────────────────────────
  async eliminarCierre(tenantId: string, id: string) {
    return this.prisma.cajaCierre.deleteMany({ where: { id, tenantId } });
  }
}
