import {
  Controller, Get, Post, Put, Delete,
  Body, Param, UseGuards, Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ConfiguracionService } from './configuracion.service';

@Controller('configuracion')
@UseGuards(JwtAuthGuard)
export class ConfiguracionController {
  constructor(private readonly service: ConfiguracionService) {}

  // ── Doctores ──────────────────────────────────────────────
  @Get('doctores')
  getDoctores(@Request() req: any) {
    return this.service.findDoctores(req.user.tenantId);
  }

  @Post('doctores')
  createDoctor(@Request() req: any, @Body() dto: any) {
    return this.service.createDoctor(req.user.tenantId, dto);
  }

  @Put('doctores/:id')
  updateDoctor(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.service.updateDoctor(req.user.tenantId, id, dto);
  }

  @Delete('doctores/:id')
  removeDoctor(@Request() req: any, @Param('id') id: string) {
    return this.service.removeDoctor(req.user.tenantId, id);
  }

  @Delete('doctores/:id/eliminar')
  hardDeleteDoctor(@Request() req: any, @Param('id') id: string) {
    return this.service.hardDeleteDoctor(req.user.tenantId, id);
  }

  // ── Tipos de atención ─────────────────────────────────────
  @Get('tipos-atencion')
  getTipos(@Request() req: any) {
    return this.service.findTipos(req.user.tenantId);
  }

  @Post('tipos-atencion')
  createTipo(@Request() req: any, @Body() dto: any) {
    return this.service.createTipo(req.user.tenantId, dto);
  }

  @Put('tipos-atencion/:id')
  updateTipo(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.service.updateTipo(req.user.tenantId, id, dto);
  }

  @Delete('tipos-atencion/:id')
  removeTipo(@Request() req: any, @Param('id') id: string) {
    return this.service.removeTipo(req.user.tenantId, id);
  }

  // ── Seed defaults ─────────────────────────────────────────
  @Post('tipos-atencion/seed-defaults')
  seedDefaults(@Request() req: any) {
    return this.service.seedTiposDefaults(req.user.tenantId);
  }
}
