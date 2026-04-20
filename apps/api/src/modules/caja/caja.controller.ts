import {
  Controller, Get, Post, Delete,
  Param, Body, Query, Request, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CajaService } from './caja.service';

@Controller('caja')
@UseGuards(JwtAuthGuard)
export class CajaController {
  constructor(private readonly service: CajaService) {}

  // GET /api/caja/ventas?fecha=YYYY-MM-DD
  @Get('ventas')
  getVentas(@Request() req: any, @Query('fecha') fecha?: string) {
    const dia = fecha ?? new Date().toISOString().slice(0, 10);
    return this.service.getVentasDia(req.user.tenantId, dia);
  }

  // GET /api/caja/total-mes?mes=YYYY-MM
  @Get('total-mes')
  getTotalMes(@Request() req: any, @Query('mes') mes?: string) {
    const m = mes ?? new Date().toISOString().slice(0, 7);
    return this.service.getVentasTotalMes(req.user.tenantId, m);
  }

  // GET /api/caja/ultimo-cierre
  @Get('ultimo-cierre')
  getUltimoCierre(@Request() req: any) {
    return this.service.getUltimoCierre(req.user.tenantId);
  }

  // GET /api/caja/historial
  @Get('historial')
  getHistorial(@Request() req: any) {
    return this.service.getHistorial(req.user.tenantId);
  }

  // POST /api/caja/cierre
  @Post('cierre')
  registrarCierre(@Request() req: any, @Body() dto: any) {
    return this.service.registrarCierre(req.user.tenantId, req.user.sub, dto);
  }

  // DELETE /api/caja/cierre/:id
  @Delete('cierre/:id')
  eliminarCierre(@Request() req: any, @Param('id') id: string) {
    return this.service.eliminarCierre(req.user.tenantId, id);
  }
}
