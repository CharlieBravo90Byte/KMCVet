import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PersonalService } from './personal.service';

@UseGuards(JwtAuthGuard)
@Controller('personal')
export class PersonalController {
  constructor(private readonly personalService: PersonalService) {}

  // ── Staff ────────────────────────────────────────────────────
  @Get()
  findAll(@CurrentUser() user: any) {
    return this.personalService.findAllStaff(user.tenantId);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() dto: any) {
    return this.personalService.createStaff(user.tenantId, dto);
  }

  @Put(':id')
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: any) {
    return this.personalService.updateStaff(user.tenantId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.personalService.deleteStaff(user.tenantId, id);
  }

  // ── Turnos ───────────────────────────────────────────────────
  @Get('turnos')
  findTurnos(
    @CurrentUser() user: any,
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
  ) {
    return this.personalService.findTurnos(user.tenantId, desde, hasta);
  }

  @Post(':staffId/turnos')
  setTurno(
    @CurrentUser() user: any,
    @Param('staffId') staffId: string,
    @Body() dto: { fecha: string; tipo: string; notas?: string },
  ) {
    return this.personalService.setTurno(user.tenantId, staffId, dto.fecha, dto.tipo, dto.notas);
  }
}
