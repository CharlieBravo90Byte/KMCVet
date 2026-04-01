import { Controller, Get, Post, Body, Query, Param, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AtencionService } from './atencion.service';

/**
 * Endpoints PÚBLICOS (sin JWT) para que clientes puedan
 * ver horarios disponibles y crear una reserva de cita.
 *
 * Se requiere el slug del tenant como query param:
 *   GET  /api/reserva?slug=demo
 *   POST /api/reserva?slug=demo
 */
@Controller('reserva')
export class ReservaPublicaController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly atencion: AtencionService,
  ) {}

  /** Devuelve info pública de la clínica (nombre, logo, teléfonos) */
  @Get('clinica')
  async getClinica(@Query('slug') slug: string) {
    if (!slug) throw new BadRequestException('slug requerido');
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: { nombre: true, logoUrl: true, telefonos: true, emailClinica: true },
    });
    if (!tenant) throw new BadRequestException('Clínica no encontrada');
    return tenant;
  }

  /** Devuelve doctores activos del tenant */
  @Get('doctores')
  async getDoctores(@Query('slug') slug: string) {
    if (!slug) throw new BadRequestException('slug requerido');
    const tenant = await this.prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) throw new BadRequestException('Clínica no encontrada');

    const vets = await this.prisma.user.findMany({
      where: { tenantId: tenant.id, rol: 'VET', activo: true },
      select: { id: true, nombre: true },
      orderBy: { nombre: 'asc' },
    });
    return vets;
  }

  /** Devuelve tipos de atención activos del tenant */
  @Get('motivos')
  async getMotivos(@Query('slug') slug: string) {
    if (!slug) throw new BadRequestException('slug requerido');
    const tenant = await this.prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) throw new BadRequestException('Clínica no encontrada');

    const tipos = await this.prisma.appointmentType.findMany({
      where: { tenantId: tenant.id, activo: true },
      select: { id: true, label: true },
      orderBy: { orden: 'asc' },
    });
    return tipos;
  }

  /** Devuelve citas del rango visible (sin datos privados) para verificar disponibilidad */
  @Get('disponibilidad')
  async getDisponibilidad(
    @Query('slug') slug: string,
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
  ) {
    if (!slug) throw new BadRequestException('slug requerido');
    const tenant = await this.prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) throw new BadRequestException('Clínica no encontrada');

    const d = desde ?? new Date().toISOString().split('T')[0];
    const h = hasta  ?? d;

    const citas = await this.prisma.appointment.findMany({
      where: {
        tenantId: tenant.id,
        fechaHora: {
          gte: new Date(d + 'T00:00:00'),
          lte: new Date(h + 'T23:59:59'),
        },
      },
      select: { veterinarioId: true, fechaHora: true, duracionMin: true },
    });

    return citas.map(c => {
      const dt = new Date(c.fechaHora);
      const fecha = dt.toISOString().split('T')[0];
      const hora  = dt.getHours() * 60 + dt.getMinutes() - 9 * 60;
      return { doctorId: c.veterinarioId, fecha, hora, duracion: c.duracionMin };
    });
  }

  /** Crea una reserva pública — guarda con estado PENDING */
  @Post()
  async crearReserva(
    @Query('slug') slug: string,
    @Body() dto: {
      fecha: string;
      hora: number;
      duracion?: number;
      nombreMascota: string;
      nombrePropietario: string;
      telefonoPropietario?: string;
      motivo: string;
      doctorId?: string;
    },
  ) {
    if (!slug) throw new BadRequestException('slug requerido');
    const tenant = await this.prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) throw new BadRequestException('Clínica no encontrada');

    return this.atencion.createPublica(tenant.id, {
      fecha: dto.fecha,
      hora: dto.hora,
      duracion: dto.duracion ?? 30,
      mascota: dto.nombreMascota,
      propietario: dto.nombrePropietario,
      telefonoPropietario: dto.telefonoPropietario,
      motivo: dto.motivo,
      doctorId: dto.doctorId ?? '',
    });
  }
}
