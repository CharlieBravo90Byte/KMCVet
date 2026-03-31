import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  findConfig(slug: string) {
    return this.prisma.tenant.findUniqueOrThrow({
      where: { slug },
      select: {
        id: true,
        slug: true,
        nombre: true,
        logoUrl: true,
        colorPrimario: true,
        colorSecundario: true,
        moneda: true,
        timezone: true,
        modulos: true,
      },
    });
  }
}
