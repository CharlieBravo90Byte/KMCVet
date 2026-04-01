import {
  Controller, Get, Post, Put, Delete,
  Body, Param, UseGuards, Request, UseInterceptors, UploadedFile, Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ConfiguracionService } from './configuracion.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { extname } from 'path';

const logoStorage = diskStorage({
  destination: (_req, _file, cb) => {
    const dir = join(process.cwd(), 'uploads', 'logos');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `logo-${unique}${extname(file.originalname)}`);
  },
});

const plantillaStorage = diskStorage({
  destination: (_req, _file, cb) => {
    const dir = join(process.cwd(), 'uploads', 'plantillas');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `plantilla-${unique}${extname(file.originalname)}`);
  },
});

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

  // ── Clínica ───────────────────────────────────────────────
  @Get('clinica')
  getClinica(@Request() req: any) {
    return this.service.findClinica(req.user.tenantId);
  }

  @Put('clinica')
  updateClinica(@Request() req: any, @Body() dto: any) {
    return this.service.updateClinica(req.user.tenantId, dto);
  }

  @Post('clinica/logo')
  @UseInterceptors(FileInterceptor('file', { storage: logoStorage }))
  uploadLogo(@Request() req: any, @UploadedFile() file: Express.Multer.File) {
    return this.service.uploadLogo(req.user.tenantId, file);
  }

  @Post('clinica/plantilla')
  @UseInterceptors(FileInterceptor('file', { storage: plantillaStorage }))
  uploadPlantilla(@Request() req: any, @UploadedFile() file: Express.Multer.File, @Query('tipo') tipo = 'boleta') {
    return this.service.uploadPlantilla(req.user.tenantId, tipo, file);
  }

  // ── Folios ────────────────────────────────────────────────
  @Get('folios')
  getFolios(@Request() req: any) {
    return this.service.findFolios(req.user.tenantId);
  }

  @Get('folios/estado')
  getFolioStatus(@Request() req: any) {
    return this.service.getFolioStatus(req.user.tenantId);
  }

  @Post('folios')
  createFolio(@Request() req: any, @Body() dto: any) {
    return this.service.createFolio(req.user.tenantId, dto);
  }

  @Delete('folios/:id')
  deleteFolio(@Request() req: any, @Param('id') id: string) {
    return this.service.deleteFolio(req.user.tenantId, id);
  }
}
