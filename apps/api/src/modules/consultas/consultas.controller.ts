import {
  Controller, Get, Post, Put, Delete, Body, Param,
  Query, UseGuards, Request, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ConsultasService } from './consultas.service';

const storage = diskStorage({
  destination: (_req, _file, cb) => {
    const dir = join(process.cwd(), 'uploads', 'consultas');
    mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${extname(file.originalname)}`);
  },
});

@Controller('consultas')
@UseGuards(JwtAuthGuard)
export class ConsultasController {
  constructor(private readonly service: ConsultasService) {}

  // GET /api/consultas?mascotaId=XXX
  @Get()
  findByMascota(
    @Request() req: any,
    @Query('mascotaId') mascotaId: string,
  ) {
    return this.service.findByMascota(req.user.tenantId, mascotaId);
  }

  // POST /api/consultas
  @Post()
  create(@Request() req: any, @Body() dto: any) {
    return this.service.create(req.user.tenantId, dto);
  }

  // PUT /api/consultas/:id
  @Put(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.service.update(req.user.tenantId, id, dto);
  }

  // DELETE /api/consultas/:id
  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.service.remove(req.user.tenantId, id);
  }

  // POST /api/consultas/:id/archivos
  @Post(':id/archivos')
  @UseInterceptors(FileInterceptor('file', { storage }))
  addArchivo(
    @Request() req: any,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.addArchivo(req.user.tenantId, id, file);
  }

  // DELETE /api/consultas/archivos/:archivoId
  @Delete('archivos/:archivoId')
  removeArchivo(@Request() req: any, @Param('archivoId') archivoId: string) {
    return this.service.removeArchivo(req.user.tenantId, archivoId);
  }
}
