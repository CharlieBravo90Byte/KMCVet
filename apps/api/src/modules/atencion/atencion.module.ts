import { Module } from '@nestjs/common';
import { AtencionController } from './atencion.controller';
import { AtencionService } from './atencion.service';

@Module({
  controllers: [AtencionController],
  providers: [AtencionService],
})
export class AtencionModule {}
