import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';

@ApiTags('Tenants')
@Controller('tenant')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get(':slug/config')
  @ApiOperation({ summary: 'Obtener configuración white-label del tenant' })
  getConfig(@Param('slug') slug: string) {
    return this.tenantsService.findConfig(slug);
  }
}
