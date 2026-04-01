import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { VentasService } from './ventas.service';

@UseGuards(JwtAuthGuard)
@Controller('ventas')
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.ventasService.findAll(user.tenantId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.ventasService.findOne(user.tenantId, id);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() dto: any) {
    return this.ventasService.create(user.tenantId, user.userId, dto);
  }

  @Put(':id/completar')
  completar(@CurrentUser() user: any, @Param('id') id: string) {
    return this.ventasService.completar(user.tenantId, id);
  }

  @Post(':id/nota-credito')
  @HttpCode(HttpStatus.CREATED)
  crearNotaCredito(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: any) {
    return this.ventasService.crearNotaCredito(user.tenantId, user.userId, id, dto.motivo);
  }

  @Delete(':id')
  eliminar(@CurrentUser() user: any, @Param('id') id: string) {
    return this.ventasService.eliminarPendiente(user.tenantId, id);
  }
}
