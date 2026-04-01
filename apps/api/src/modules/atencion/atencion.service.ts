import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Mapa doctor frontend → usuario en BD (seed)
// En el futuro se puede hacer dinámico; por ahora los 3 doctores demo
// viven en la tabla users como VET. Si no existen, se crea un vet demo.

@Injectable()
export class AtencionService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Listar citas por rango de fechas ──────────────────────────
  async findByRango(tenantId: string, desde: string, hasta: string) {
    const citas = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        fechaHora: {
          gte: new Date(desde + 'T00:00:00'),
          lte: new Date(hasta + 'T23:59:59'),
        },
      },
      include: {
        mascota: { select: { nombre: true, propietario: { select: { nombre: true } } } },
        veterinario: { select: { nombre: true, email: true } },
      },
      orderBy: { fechaHora: 'asc' },
    });
    return citas.map((c) => this.mapCita(c));
  }

  // ── Crear cita ────────────────────────────────────────────────
  async create(tenantId: string, dto: any) {
    // Obtener o crear el veterinario demo por doctorId (d1, d2, d3)
    const vet = await this.getOrCreateVet(tenantId, dto.doctorId);

    // Si se envía mascotaId, usarla directamente; si no, buscar/crear por nombre
    let mascota: any;
    if (dto.mascotaId) {
      mascota = await this.prisma.pet.findFirst({
        where: { id: dto.mascotaId, tenantId },
      });
    }
    if (!mascota) {
      mascota = await this.getOrCreatePet(tenantId, dto.mascota, dto.propietario);
    }

    // Calcular fecha+hora completa
    const fechaHora = this.buildFechaHora(dto.fecha, dto.hora);

    const cita = await this.prisma.appointment.create({
      data: {
        tenantId,
        mascotaId: mascota.id,
        veterinarioId: vet.id,
        fechaHora,
        duracionMin: dto.duracion ?? 30,
        motivo: dto.motivo,
        estado: 'PENDING',
      },
      include: {
        mascota: { select: { nombre: true, propietario: { select: { nombre: true } } } },
        veterinario: { select: { nombre: true, email: true } },
      },
    });

    return this.mapCita(cita);
  }

  // ── Eliminar cita ─────────────────────────────────────────────
  async remove(tenantId: string, id: string) {
    const cita = await this.prisma.appointment.findFirst({ where: { id, tenantId } });
    if (!cita) throw new NotFoundException('Cita no encontrada');
    await this.prisma.appointment.delete({ where: { id } });
    return { ok: true };
  }

  // ── Reserva pública (sin JWT) ─────────────────────────────────
  async createPublica(tenantId: string, dto: {
    fecha: string;
    hora: number;
    duracion: number;
    mascota: string;
    propietario: string;
    telefonoPropietario?: string;
    motivo: string;
    doctorId: string;
  }) {
    const mascota = await this.getOrCreatePet(tenantId, dto.mascota, dto.propietario, dto.telefonoPropietario);
    const fechaHora = this.buildFechaHora(dto.fecha, dto.hora);

    // Si se envía un doctorId válido, usarlo; si no, asignar a cualquier vet disponible
    let veterinarioId: string | null = null;
    if (dto.doctorId) {
      const vet = await this.prisma.user.findFirst({ where: { id: dto.doctorId, tenantId, activo: true } });
      if (vet) veterinarioId = vet.id;
    }
    if (!veterinarioId) {
      const anyVet = await this.prisma.user.findFirst({ where: { tenantId, rol: 'VET', activo: true } });
      if (anyVet) veterinarioId = anyVet.id;
    }
    if (!veterinarioId) {
      const vet = await this.getOrCreateVet(tenantId, 'd1');
      veterinarioId = vet.id;
    }

    const cita = await this.prisma.appointment.create({
      data: {
        tenantId,
        mascotaId: mascota.id,
        veterinarioId,
        fechaHora,
        duracionMin: dto.duracion,
        motivo: dto.motivo,
        estado: 'PENDING',
      },
      include: {
        mascota: { select: { nombre: true, propietario: { select: { nombre: true } } } },
        veterinario: { select: { nombre: true, email: true } },
      },
    });

    return {
      ok: true,
      mensaje: '¡Reserva registrada! La clínica te contactará para confirmar.',
      cita: {
        fecha: dto.fecha,
        hora: dto.hora,
        motivo: dto.motivo,
        doctor: cita.veterinario?.nombre ?? '',
      },
    };
  }

  // ── Helpers privados ──────────────────────────────────────────
  private buildFechaHora(fecha: string, minutosDesdeInicio: number): Date {
    // minutosDesdeInicio = minutos desde las 09:00
    const baseMinutes = 9 * 60 + minutosDesdeInicio;
    const h = Math.floor(baseMinutes / 60);
    const m = baseMinutes % 60;
    return new Date(`${fecha}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
  }

  // Devuelve minutos desde 09:00 a partir de un Date
  private horaToMinutos(date: Date): number {
    return date.getHours() * 60 + date.getMinutes() - 9 * 60;
  }

  private async getOrCreateVet(tenantId: string, doctorId: string) {
    // Si doctorId parece un UUID real, buscar directamente en la BD
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(doctorId)) {
      const user = await this.prisma.user.findFirst({
        where: { id: doctorId, tenantId },
      });
      if (user) return user;
    }

    // Fallback: convención antigua d1/d2/d3 (compatibilidad)
    const nombresVet: Record<string, string> = {
      d1: 'Doctor 1', d2: 'Doctor 2', d3: 'Doctor 3',
    };
    const nombre = nombresVet[doctorId] ?? 'Doctor 1';
    const email   = `${doctorId}@demo.kmcvet.com`;

    let user = await this.prisma.user.findFirst({
      where: { tenantId, email },
    });

    if (!user) {
      const bcrypt = await import('bcryptjs');
      const hash   = await bcrypt.hash('Vet1234!', 12);
      user = await this.prisma.user.create({
        data: { tenantId, nombre, email, passwordHash: hash, rol: 'VET' },
      });
    }
    return user;
  }

  private async getOrCreatePet(tenantId: string, nombreMascota: string, nombrePropietario: string, telefonoPropietario?: string) {
    // Buscar mascota por nombre en el tenant
    let pet = await this.prisma.pet.findFirst({
      where: { tenantId, nombre: nombreMascota },
    });

    if (!pet) {
      // Crear propietario mínimo si no existe
      let owner = await this.prisma.owner.findFirst({
        where: { tenantId, nombre: nombrePropietario },
      });
      if (!owner) {
        owner = await this.prisma.owner.create({
          data: {
            tenantId,
            nombre: nombrePropietario || 'Propietario desconocido',
            documento: `tmp-${Date.now()}`,
            telefono: telefonoPropietario || '000000000',
          },
        });
      }

      pet = await this.prisma.pet.create({
        data: {
          tenantId,
          propietarioId: owner.id,
          nombre: nombreMascota || 'Mascota sin nombre',
          especie: 'OTHER',
          sexo: 'UNKNOWN',
        },
      });
    }

    return pet;
  }

  // ── Historial de atenciones por mascota ─────────────────────
  async findHistorialMascota(tenantId: string, mascotaId: string) {
    const citas = await this.prisma.appointment.findMany({
      where: { tenantId, mascotaId },
      include: {
        mascota: { select: { nombre: true, propietario: { select: { nombre: true } } } },
        veterinario: { select: { nombre: true, email: true } },
      },
      orderBy: { fechaHora: 'desc' },
    });
    return citas.map((c) => this.mapCita(c));
  }

  private mapCita(c: any) {
    const d = new Date(c.fechaHora);
    const fechaStr = d.toISOString().split('T')[0];
    const horas    = d.getHours();
    const minutos  = d.getMinutes();
    const horaMin  = horas * 60 + minutos - 9 * 60; // minutos desde 09:00

    return {
      id: c.id,
      fecha: fechaStr,
      hora: horaMin,
      duracion: c.duracionMin as 15 | 30 | 60,
      mascota: c.mascota?.nombre ?? '',
      mascotaId: c.mascotaId ?? '',
      propietario: c.mascota?.propietario?.nombre ?? '',
      motivo: c.motivo,
      doctorId: c.veterinarioId ?? '',
      doctorNombre: c.veterinario?.nombre ?? '',
      estado: c.estado,
    };
  }
}
