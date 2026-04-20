import {
  Controller, Get, Post, Delete,
  Param, Body, Query, Request, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { MetasService } from './metas.service';

@Controller('metas')
@UseGuards(JwtAuthGuard)
export class MetasController {
  constructor(private readonly service: MetasService) {}

  // GET /api/metas
  @Get()
  getAll(@Request() req: any) {
    return this.service.getAll(req.user.tenantId);
  }

  // GET /api/metas/activa?tipo=diaria|mensual
  @Get('activa')
  getActiva(@Request() req: any, @Query('tipo') tipo: string = 'diaria') {
    return this.service.getActiva(req.user.tenantId, tipo);
  }

  // POST /api/metas  { tipo: 'diaria'|'mensual', monto: number }
  @Post()
  upsert(@Request() req: any, @Body() body: { tipo: string; monto: number }) {
    return this.service.upsert(req.user.tenantId, body.tipo, body.monto);
  }

  // DELETE /api/metas/:id
  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.service.remove(req.user.tenantId, id);
  }
}
