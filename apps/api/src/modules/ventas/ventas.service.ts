import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VentasService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Listar ventas del tenant ──────────────────────────────────
  async findAll(tenantId: string) {
    const ventas = await this.prisma.sale.findMany({
      where: { tenantId },
      include: {
        usuario: { select: { nombre: true } },
        items: {
          include: {
            producto: { select: { id: true, nombre: true, unidad: true } },
          },
        },
      },
      orderBy: { fecha: 'desc' },
    });
    return ventas.map((v) => this.mapVenta(v));
  }

  // ── Obtener una venta ────────────────────────────────────────
  async findOne(tenantId: string, id: string) {
    const venta = await this.prisma.sale.findFirst({
      where: { id, tenantId },
      include: {
        usuario: { select: { nombre: true } },
        items: {
          include: {
            producto: { select: { id: true, nombre: true, unidad: true } },
          },
        },
      },
    });
    if (!venta) throw new NotFoundException('Venta no encontrada');
    return this.mapVenta(venta);
  }

  // ── Crear venta (servicios + productos) ──────────────────────
  async create(tenantId: string, userId: string, dto: any) {
    const { items, notas, tipoDoc = 'boleta', rutCliente } = dto;

    if (tipoDoc === 'factura' && !rutCliente?.trim()) {
      throw new BadRequestException('El RUT del cliente es requerido para facturas');
    }

    if (!items || items.length === 0) {
      throw new BadRequestException('La venta debe tener al menos un ítem');
    }

    // Verificar stock sólo para productos
    for (const item of items.filter((it: any) => it.tipo === 'PRODUCTO' && it.productoId)) {
      const producto = await this.prisma.product.findFirst({
        where: { id: item.productoId, tenantId, activo: true },
      });
      if (!producto) {
        throw new NotFoundException(`Producto no encontrado: ${item.descripcion}`);
      }
      if (producto.stockActual < item.cantidad) {
        throw new BadRequestException(
          `Stock insuficiente para "${producto.nombre}". Disponible: ${producto.stockActual}, solicitado: ${item.cantidad}`,
        );
      }
    }

    // Calcular total resolviendo precios
    let total = 0;
    const itemsFinales: any[] = [];
    for (const item of items) {
      let precio = parseFloat(item.precioUnitario) || 0;
      if (item.tipo === 'PRODUCTO' && item.productoId && precio === 0) {
        const prod = await this.prisma.product.findFirst({ where: { id: item.productoId, tenantId } });
        precio = prod?.precioVenta ?? 0;
      }
      const subtotal = precio * (item.cantidad ?? 1);
      total += subtotal;
      itemsFinales.push({ ...item, precioUnitario: precio, subtotal });
    }

    // Transacción: crear venta + items + descontar stock de productos
    const venta = await this.prisma.$transaction(async (tx) => {
      // ── Asignar folio ──
      let numeroDocumento: number | null = null;
      const folioActivo = await tx.folioRange.findFirst({
        where: { tenantId, tipo: tipoDoc, activo: true },
        orderBy: { desde: 'asc' },
      });
      if (folioActivo && folioActivo.actual <= folioActivo.hasta) {
        numeroDocumento = folioActivo.actual;
        await tx.folioRange.update({
          where: { id: folioActivo.id },
          data: { actual: folioActivo.actual + 1 },
        });
      }

      const nuevaVenta = await tx.sale.create({
        data: {
          tenantId,
          usuarioId: userId,
          total,
          notas: notas || null,
          tipoDoc,
          numeroDocumento,
          estado: numeroDocumento ? 'COMPLETADA' : 'PENDIENTE',
          rutCliente: rutCliente?.trim() || null,
          items: {
            create: itemsFinales.map((it) => ({
              tipo: it.tipo === 'SERVICIO' ? 'SERVICIO' : 'PRODUCTO',
              descripcion: it.descripcion ?? '',
              productoId: it.productoId ?? null,
              cantidad: it.cantidad,
              precioUnitario: it.precioUnitario,
              subtotal: it.subtotal,
            })),
          },
        },
        include: {
          usuario: { select: { nombre: true } },
          items: {
            include: {
              producto: { select: { id: true, nombre: true, unidad: true } },
            },
          },
        },
      });

      for (const it of itemsFinales.filter((i) => i.tipo !== 'SERVICIO' && i.productoId)) {
        await tx.product.update({
          where: { id: it.productoId },
          data: { stockActual: { decrement: it.cantidad } },
        });
        await tx.stockMovement.create({
          data: {
            productoId: it.productoId,
            tenantId,
            usuarioId: userId,
            tipo: 'OUT',
            cantidad: it.cantidad,
            referenciaId: nuevaVenta.id,
            notas: `Venta #${nuevaVenta.id.slice(0, 8)}`,
          },
        });
      }

      return { ...nuevaVenta, _sinFolio: !numeroDocumento };
    });

    const result = this.mapVenta(venta);
    if ((venta as any)._sinFolio) {
      (result as any)._alerta = 'El cobro no pudo completarse automáticamente. Revísalo en la pestaña Pendientes y usa «Reintentar» para volver a intentarlo.';
    }
    return result;
  }

  // ── Generar Nota de Crédito ───────────────────────────────────────
  async crearNotaCredito(tenantId: string, userId: string, ventaId: string, motivo: string) {
    if (!motivo?.trim()) throw new BadRequestException('El motivo es requerido');

    const ventaOriginal = await this.prisma.sale.findFirst({
      where: { id: ventaId, tenantId },
      include: { items: true },
    });
    if (!ventaOriginal) throw new NotFoundException('Venta no encontrada');
    if (ventaOriginal.tipoDoc === 'nota_credito') {
      throw new BadRequestException('No se puede generar Nota de Crédito de una Nota de Crédito');
    }
    if (ventaOriginal.estado !== 'COMPLETADA') {
      throw new BadRequestException('Solo se puede generar Nota de Crédito de ventas completadas');
    }

    const nc = await this.prisma.$transaction(async (tx) => {
      let numeroDocumento: number | null = null;
      const folioActivo = await tx.folioRange.findFirst({
        where: { tenantId, tipo: 'nota_credito', activo: true },
        orderBy: { desde: 'asc' },
      });
      if (folioActivo && folioActivo.actual <= folioActivo.hasta) {
        numeroDocumento = folioActivo.actual;
        await tx.folioRange.update({
          where: { id: folioActivo.id },
          data: { actual: folioActivo.actual + 1 },
        });
      }

      return tx.sale.create({
        data: {
          tenantId,
          usuarioId: userId,
          total: ventaOriginal.total,
          notas: motivo.trim(),
          tipoDoc: 'nota_credito',
          numeroDocumento,
          estado: numeroDocumento ? 'COMPLETADA' : 'PENDIENTE',
          rutCliente: ventaOriginal.rutCliente,
          ventaReferenciaId: ventaOriginal.id,
          items: {
            create: ventaOriginal.items.map((it) => ({
              tipo: it.tipo,
              descripcion: it.descripcion,
              productoId: it.productoId,
              cantidad: it.cantidad,
              precioUnitario: it.precioUnitario,
              subtotal: it.subtotal,
            })),
          },
        },
        include: {
          usuario: { select: { nombre: true } },
          items: {
            include: {
              producto: { select: { id: true, nombre: true, unidad: true } },
            },
          },
        },
      });
    });

    return this.mapVenta(nc);
  }

  // ── Asignar folio a venta pendiente ─────────────────────────────
  async completar(tenantId: string, id: string) {
    const venta = await this.prisma.sale.findFirst({ where: { id, tenantId } });
    if (!venta) throw new NotFoundException('Venta no encontrada');
    if (venta.estado !== 'PENDIENTE') throw new BadRequestException('La venta ya tiene folio asignado');

    const folioActivo = await this.prisma.folioRange.findFirst({
      where: { tenantId, tipo: venta.tipoDoc, activo: true },
      orderBy: { desde: 'asc' },
    });
    if (!folioActivo || folioActivo.actual > folioActivo.hasta) {
      throw new BadRequestException(`Sin folios disponibles para ${venta.tipoDoc}. Carga un rango en Configuración → Folios.`);
    }

    const numeroDocumento = folioActivo.actual;
    await this.prisma.folioRange.update({
      where: { id: folioActivo.id },
      data: { actual: folioActivo.actual + 1 },
    });
    const actualizada = await this.prisma.sale.update({
      where: { id },
      data: { numeroDocumento, estado: 'COMPLETADA' },
      include: {
        usuario: { select: { nombre: true } },
        items: { include: { producto: { select: { id: true, nombre: true, unidad: true } } } },
      },
    });
    return this.mapVenta(actualizada);
  }

  // ── Eliminar venta pendiente ──────────────────────────────────
  async eliminarPendiente(tenantId: string, id: string) {
    const venta = await this.prisma.sale.findFirst({ where: { id, tenantId } });
    if (!venta) throw new NotFoundException('Venta no encontrada');
    if (venta.estado !== 'PENDIENTE') throw new BadRequestException('Solo se pueden eliminar ventas en estado PENDIENTE');
    await this.prisma.saleItem.deleteMany({ where: { saleId: id } });
    await this.prisma.sale.delete({ where: { id } });
    return { deleted: true };
  }

  // ── Mapper ────────────────────────────────────────────────────
  private mapVenta(v: any) {
    return {
      id: v.id,
      fecha: v.fecha,
      total: v.total,
      notas: v.notas,
      tipoDoc: v.tipoDoc ?? 'boleta',
      numeroDocumento: v.numeroDocumento ?? null,
      estado: v.estado ?? 'COMPLETADA',
      rutCliente: v.rutCliente ?? null,
      ventaReferenciaId: v.ventaReferenciaId ?? null,
      vendedor: v.usuario?.nombre ?? '',
      createdAt: v.createdAt,
      items: v.items.map((it: any) => ({
        id: it.id,
        tipo: it.tipo,
        descripcion: it.descripcion,
        productoId: it.productoId,
        unidad: it.producto?.unidad ?? 'un.',
        cantidad: it.cantidad,
        precioUnitario: it.precioUnitario,
        subtotal: it.subtotal,
      })),
    };
  }
}
