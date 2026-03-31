import {
  Controller,
  Get,
  Post,
  Put,
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
import { AnimalesService } from './animales.service';

// Sobreescribimos el ValidationPipe global para este controlador
// (sin whitelist para aceptar el body flexible del frontend)
const flexPipe = new ValidationPipe({ transform: true, whitelist: false });

@Controller('animales')
@UseGuards(JwtAuthGuard)
@UsePipes(flexPipe)
export class AnimalesController {
  constructor(private readonly service: AnimalesService) {}

  // Debe estar ANTES de @Get(':id') para que NestJS no lo trate como param
  @Get('buscar-tutor')
  async buscarTutor(@Request() req: any, @Query('rut') rut: string) {
    // Devuelve null (200) si no existe — no 404, para distinguir "no encontrado" de "ruta inexistente"
    return this.service.buscarPorRut(req.user.tenantId, rut ?? '');
  }

  @Get()
  findAll(@Request() req: any) {
    return this.service.findAll(req.user.tenantId);
  }

  @Post()
  create(@Request() req: any, @Body() dto: any) {
    return this.service.create(req.user.tenantId, dto);
  }

  @Put(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.service.update(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.service.remove(req.user.tenantId, id);
  }
}
