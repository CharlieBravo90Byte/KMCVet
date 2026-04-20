import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnimalesService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Listado completo de mascotas del tenant ──────────────────
  async findAll(tenantId: string) {
    const pets = await this.prisma.pet.findMany({
      where: { tenantId },
      include: {
        propietario: true,
        pesosHistorico: { orderBy: { fecha: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
    return pets.map((p) => this.mapPet(p));
  }

  // ── Crear propietario + mascota ──────────────────────────────
  async create(tenantId: string, dto: any) {
    // Acepta tanto dto.tutor como dto.propietario (compatibilidad)
    const tutorData = dto.tutor ?? dto.propietario;
    // Buscar o crear propietario por documento
    let owner = await this.prisma.owner.findUnique({
      where: {
        tenantId_documento: {
          tenantId,
          documento: tutorData.documento,
        },
      },
    });

    if (!owner) {
      owner = await this.prisma.owner.create({
        data: {
          tenantId,
          nombre: tutorData.nombre,
          documento: tutorData.documento,
          telefono: tutorData.telefono,
          email: tutorData.email || null,
          direccion: tutorData.direccion || null,
        },
      });
    } else {
      // Actualizar datos del propietario si ya existe
      owner = await this.prisma.owner.update({
        where: { id: owner.id },
        data: {
          nombre: tutorData.nombre,
          telefono: tutorData.telefono,
          email: tutorData.email || null,
          direccion: tutorData.direccion || null,
        },
      });
    }

    const pet = await this.prisma.pet.create({
      data: {
        tenantId,
        propietarioId: owner.id,
        nombre: dto.nombre,
        especie: this.mapEspecieIn(dto.especie),
        raza: dto.raza || null,
        sexo: this.mapSexoIn(dto.sexo),
        fechaNacimiento: dto.fechaNacimiento ? new Date(dto.fechaNacimiento) : null,
        color: dto.color || null,
        microchip: dto.microchip || null,
        fotoUrl: dto.foto || null,
        alergias: dto.alergias || null,
        condicionesPrevias: dto.condiciones || null,
      },
      include: {
        propietario: true,
        pesosHistorico: { orderBy: { fecha: 'desc' }, take: 1 },
      },
    });

    if (dto.peso && parseFloat(dto.peso) > 0) {
      await this.prisma.petWeight.create({
        data: { petId: pet.id, pesoKg: parseFloat(dto.peso) },
      });
    }

    return this.mapPet(pet);
  }

  // ── Actualizar mascota ───────────────────────────────────────
  async update(tenantId: string, id: string, dto: any) {
    const pet = await this.prisma.pet.findFirst({ where: { id, tenantId } });
    if (!pet) throw new NotFoundException('Mascota no encontrada');

    // Acepta tanto dto.tutor como dto.propietario (compatibilidad)
    const tutorData = dto.tutor ?? dto.propietario;
    // Actualizar propietario
    await this.prisma.owner.update({
      where: { id: pet.propietarioId },
      data: {
        nombre: tutorData.nombre,
        telefono: tutorData.telefono,
        email: tutorData.email || null,
        direccion: tutorData.direccion || null,
      },
    });

    const updated = await this.prisma.pet.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        especie: this.mapEspecieIn(dto.especie),
        raza: dto.raza || null,
        sexo: this.mapSexoIn(dto.sexo),
        fechaNacimiento: dto.fechaNacimiento ? new Date(dto.fechaNacimiento) : null,
        color: dto.color || null,
        microchip: dto.microchip || null,
        fotoUrl: dto.foto || null,
        alergias: dto.alergias || null,
        condicionesPrevias: dto.condiciones || null,
      },
      include: {
        propietario: true,
        pesosHistorico: { orderBy: { fecha: 'desc' }, take: 1 },
      },
    });

    if (dto.peso && parseFloat(dto.peso) > 0) {
      await this.prisma.petWeight.create({
        data: { petId: id, pesoKg: parseFloat(dto.peso) },
      });
      // Refrescar para devolver el nuevo peso
      const fresh = await this.prisma.pet.findUnique({
        where: { id },
        include: {
          propietario: true,
          pesosHistorico: { orderBy: { fecha: 'desc' }, take: 1 },
        },
      });
      return this.mapPet(fresh);
    }

    return this.mapPet(updated);
  }

  // ── Eliminar mascota ─────────────────────────────────────────
  async remove(tenantId: string, id: string) {
    const pet = await this.prisma.pet.findFirst({ where: { id, tenantId } });
    if (!pet) throw new NotFoundException('Mascota no encontrada');
    await this.prisma.pet.delete({ where: { id } });
    return { ok: true };
  }

  // ── Mapeos ───────────────────────────────────────────────────
  private mapEspecieIn(e: string): any {
    const m: Record<string, string> = {
      DOG: 'DOG', CAT: 'CAT', BIRD: 'BIRD', RABBIT: 'RABBIT',
      REPTIL: 'REPTILE', REPTILE: 'REPTILE', OTHER: 'OTHER',
    };
    return (m[e?.toUpperCase()] ?? 'OTHER');
  }

  private mapEspecieOut(e: string): string {
    return e === 'REPTILE' ? 'REPTIL' : e;
  }

  private mapSexoIn(s: string): any {
    if (s === 'M') return 'MALE';
    if (s === 'F') return 'FEMALE';
    return 'UNKNOWN';
  }

  private mapSexoOut(s: string): string {
    if (s === 'MALE') return 'M';
    if (s === 'FEMALE') return 'F';
    return '';
  }

  private mapPet(p: any) {
    return {
      id: p.id,
      nombre: p.nombre,
      especie: this.mapEspecieOut(p.especie),
      raza: p.raza ?? '',
      sexo: this.mapSexoOut(p.sexo),
      fechaNacimiento: p.fechaNacimiento
        ? new Date(p.fechaNacimiento).toISOString().split('T')[0]
        : '',
      color: p.color ?? '',
      microchip: p.microchip ?? '',
      peso: p.pesosHistorico?.[0]?.pesoKg?.toString() ?? '',
      alergias: p.alergias ?? '',
      condiciones: p.condicionesPrevias ?? '',
      foto: p.fotoUrl ?? '',
      tutorId: p.propietario?.id ?? '',          // <─ necesario para hospedaje
      tutor: {
        id:        p.propietario?.id        ?? '',
        nombre:    p.propietario?.nombre    ?? '',
        documento: p.propietario?.documento ?? '',
        telefono:  p.propietario?.telefono  ?? '',
        email:     p.propietario?.email     ?? '',
        direccion: p.propietario?.direccion ?? '',
      },
    };
  }

  // ── Buscar tutor por RUT/documento ──────────────────────────
  async buscarPorRut(tenantId: string, rut: string) {
    const owner = await this.prisma.owner.findFirst({
      where: { tenantId, documento: rut },
      include: {
        mascotas: {
          where: { tenantId },
          orderBy: { nombre: 'asc' },
        },
      },
    });
    if (!owner) return null;
    return {
      id: owner.id,
      nombre: owner.nombre,
      documento: owner.documento,
      telefono: owner.telefono ?? '',
      email: owner.email ?? '',
      mascotas: owner.mascotas.map((m: any) => ({
        id: m.id,
        nombre: m.nombre,
        especie: this.mapEspecieOut(m.especie),
        raza: m.raza ?? '',
      })),
    };
  }
}
