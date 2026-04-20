import {
  Controller, Get, Post, Put, Patch, Param, Body, Query, Request, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { HospitalService } from './hospital.service';

@Controller('hospital')
@UseGuards(JwtAuthGuard)
export class HospitalController {
  constructor(private readonly service: HospitalService) {}

  // GET /api/hospital?estado=activo
  @Get()
  getAll(@Request() req: any, @Query('estado') estado?: string) {
    return this.service.getAll(req.user.tenantId, estado);
  }

  // GET /api/hospital/stats
  @Get('stats')
  getStats(@Request() req: any) {
    return this.service.getStats(req.user.tenantId);
  }

  // GET /api/hospital/:id
  @Get(':id')
  getById(@Request() req: any, @Param('id') id: string) {
    return this.service.getById(req.user.tenantId, id);
  }

  // POST /api/hospital
  @Post()
  crear(@Request() req: any, @Body() dto: any) {
    return this.service.crear(req.user.tenantId, dto);
  }

  // PUT /api/hospital/:id
  @Put(':id')
  actualizar(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.service.actualizar(req.user.tenantId, id, dto);
  }

  // PATCH /api/hospital/:id/checkout
  @Patch(':id/checkout')
  checkout(@Request() req: any, @Param('id') id: string, @Body() body: { fechaSalidaReal?: string }) {
    return this.service.checkout(req.user.tenantId, id, body.fechaSalidaReal);
  }
}
