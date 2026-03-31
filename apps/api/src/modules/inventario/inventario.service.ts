import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InventarioService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Listar productos del tenant ──────────────────────────────
  async findAll(tenantId: string) {
    const products = await this.prisma.product.findMany({
      where: { tenantId, activo: true },
      include: { proveedor: { select: { nombre: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return products.map((p) => this.mapProduct(p));
  }

  // ── Registrar entrada de producto ────────────────────────────
  async create(tenantId: string, userId: string, dto: any) {
    // Buscar o crear proveedor si se indicó nombre
    let proveedorId: string | null = null;
    if (dto.proveedor?.trim()) {
      let supplier = await this.prisma.supplier.findFirst({
        where: { tenantId, nombre: dto.proveedor.trim() },
      });
      if (!supplier) {
        supplier = await this.prisma.supplier.create({
          data: {
            tenantId,
            nombre: dto.proveedor.trim(),
            contacto: dto.proveedorRut || null,
          },
        });
      }
      proveedorId = supplier.id;
    }

    const categoria = this.mapCategoriaIn(dto.categoria);

    const product = await this.prisma.product.create({
      data: {
        tenantId,
        nombre: dto.nombre,
        codigo: dto.codigo?.trim() || null,
        descripcion: dto.descripcion || null,
        categoria,
        unidad: dto.unidad ?? 'unidad',
        stockActual: dto.stockActual ?? 0,
        stockMinimo: dto.stockMinimo ?? 0,
        precioCosto: dto.precioCompra ? parseFloat(dto.precioCompra) : null,
        precioVenta: dto.precioVenta ? parseFloat(dto.precioVenta) : null,
        fechaVencimiento: dto.fechaVencimiento ? new Date(dto.fechaVencimiento) : null,
        proveedorId,
      },
      include: { proveedor: { select: { nombre: true } } },
    });

    // Registrar movimiento de stock
    await this.prisma.stockMovement.create({
      data: {
        productoId: product.id,
        tenantId,
        usuarioId: userId,
        tipo: 'IN',
        cantidad: product.stockActual,
        notas: dto.numeroDoc
          ? `${dto.tipoDoc ?? 'documento'} N° ${dto.numeroDoc}`
          : 'Registro inicial',
      },
    });

    return this.mapProduct(product);
  }

  // ── Actualizar producto ──────────────────────────────────────
  async update(tenantId: string, userId: string, id: string, dto: any) {
    const existing = await this.prisma.product.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Producto no encontrado');

    let proveedorId = existing.proveedorId;
    if (dto.proveedor?.trim()) {
      let supplier = await this.prisma.supplier.findFirst({
        where: { tenantId, nombre: dto.proveedor.trim() },
      });
      if (!supplier) {
        supplier = await this.prisma.supplier.create({
          data: { tenantId, nombre: dto.proveedor.trim(), contacto: dto.proveedorRut || null },
        });
      }
      proveedorId = supplier.id;
    }

    const categoria = this.mapCategoriaIn(dto.categoria);

    // Calcular diferencia de stock si cambió
    const nuevoStock = dto.stockActual ?? existing.stockActual;
    const diffStock = nuevoStock - existing.stockActual;

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        codigo: dto.codigo?.trim() || null,
        descripcion: dto.descripcion || null,
        categoria,
        unidad: dto.unidad ?? existing.unidad,
        stockActual: nuevoStock,
        stockMinimo: dto.stockMinimo ?? existing.stockMinimo,
        precioCosto: dto.precioCompra ? parseFloat(dto.precioCompra) : existing.precioCosto,
        precioVenta: dto.precioVenta ? parseFloat(dto.precioVenta) : existing.precioVenta,
        fechaVencimiento: dto.fechaVencimiento ? new Date(dto.fechaVencimiento) : existing.fechaVencimiento,
        proveedorId,
      },
      include: { proveedor: { select: { nombre: true } } },
    });

    // Registrar movimiento si el stock cambió
    if (diffStock !== 0) {
      await this.prisma.stockMovement.create({
        data: {
          productoId: id,
          tenantId,
          usuarioId: userId,
          tipo: diffStock > 0 ? 'IN' : 'OUT',
          cantidad: Math.abs(diffStock),
          notas: 'Ajuste manual',
        },
      });
    }

    return this.mapProduct(updated);
  }

  // ── Mapeos ───────────────────────────────────────────────────
  private mapCategoriaIn(c: string): any {
    const m: Record<string, string> = {
      medicamento: 'MEDICATION',
      alimento: 'FOOD',
      accesorio: 'SUPPLY',
      clinico: 'EQUIPMENT',
      otro: 'OTHER',
      MEDICATION: 'MEDICATION',
      FOOD: 'FOOD',
      SUPPLY: 'SUPPLY',
      EQUIPMENT: 'EQUIPMENT',
      OTHER: 'OTHER',
    };
    return m[c] ?? 'OTHER';
  }

  private mapCategoriaOut(c: string): string {
    const m: Record<string, string> = {
      MEDICATION: 'medicamento',
      FOOD: 'alimento',
      SUPPLY: 'accesorio',
      EQUIPMENT: 'clinico',
      OTHER: 'otro',
    };
    return m[c] ?? 'otro';
  }

  private mapProduct(p: any) {
    return {
      id: p.id,
      nombre: p.nombre,
      codigo: p.codigo ?? '',
      categoria: this.mapCategoriaOut(p.categoria),
      unidad: p.unidad,
      stockActual: p.stockActual,
      stockMinimo: p.stockMinimo,
      precioCompra: p.precioCosto ?? 0,
      precioVenta: p.precioVenta ?? 0,
      proveedor: p.proveedor?.nombre ?? '',
      fechaVencimiento: p.fechaVencimiento
        ? new Date(p.fechaVencimiento).toISOString().split('T')[0]
        : '',
      descripcion: p.descripcion ?? '',
      tipoDoc: '',
      numeroDoc: '',
      fechaDoc: '',
      proveedorRut: '',
      proveedorDireccion: '',
    };
  }
}
