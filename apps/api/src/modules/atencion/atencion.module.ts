import { Module } from '@nestjs/common';
import { AtencionController } from './atencion.controller';
import { AtencionService } from './atencion.service';
import { ReservaPublicaController } from './reserva-publica.controller';

@Module({
  controllers: [AtencionController, ReservaPublicaController],
  providers: [AtencionService],
})
export class AtencionModule {}
