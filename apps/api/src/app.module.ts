import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { AtencionModule } from './modules/atencion/atencion.module';
import { InventarioModule } from './modules/inventario/inventario.module';
import { AnimalesModule } from './modules/animales/animales.module';
import { ConsultasModule } from './modules/consultas/consultas.module';
import { ConfiguracionModule } from './modules/configuracion/configuracion.module';
import { VentasModule } from './modules/ventas/ventas.module';
import { PersonalModule } from './modules/personal/personal.module';

@Module({
  imports: [
    // ── Configuración global ───────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // ── Rate limiting ──────────────────────────────────────
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },
      { name: 'long', ttl: 60000, limit: 200 },
    ]),

    // ── Prisma ─────────────────────────────────────────────
    PrismaModule,

    // ── Módulos de negocio ─────────────────────────────────
    AuthModule,
    TenantsModule,
    UsersModule,
    AtencionModule,
    InventarioModule,
    AnimalesModule,
    ConsultasModule,
    ConfiguracionModule,
    VentasModule,
    PersonalModule,
  ],
})
export class AppModule {}
