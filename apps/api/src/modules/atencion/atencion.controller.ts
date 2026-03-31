import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AtencionService } from './atencion.service';

const flexPipe = new ValidationPipe({ transform: true, whitelist: false });

@Controller('citas')
@UseGuards(JwtAuthGuard)
@UsePipes(flexPipe)
export class AtencionController {
  constructor(private readonly service: AtencionService) {}

  // GET /api/citas?desde=2026-03-01&hasta=2026-03-31
  @Get()
  findByRango(
    @Request() req: any,
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
  ) {
    const d = desde ?? new Date().toISOString().split('T')[0];
    const h = hasta  ?? d;
    return this.service.findByRango(req.user.tenantId, d, h);
  }

  // GET /api/citas/historial/:mascotaId
  @Get('historial/:mascotaId')
  findHistorial(
    @Request() req: any,
    @Param('mascotaId') mascotaId: string,
  ) {
    return this.service.findHistorialMascota(req.user.tenantId, mascotaId);
  }

  @Post()
  create(@Request() req: any, @Body() dto: any) {
    return this.service.create(req.user.tenantId, dto);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.service.remove(req.user.tenantId, id);
  }
}
