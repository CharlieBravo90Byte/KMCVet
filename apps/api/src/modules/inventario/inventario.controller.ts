import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { InventarioService } from './inventario.service';

const flexPipe = new ValidationPipe({ transform: true, whitelist: false });

@Controller('inventario')
@UseGuards(JwtAuthGuard)
@UsePipes(flexPipe)
export class InventarioController {
  constructor(private readonly service: InventarioService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.service.findAll(req.user.tenantId);
  }

  @Post()
  create(@Request() req: any, @Body() dto: any) {
    return this.service.create(req.user.tenantId, req.user.userId, dto);
  }

  @Put(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.service.update(req.user.tenantId, req.user.userId, id, dto);
  }
}
