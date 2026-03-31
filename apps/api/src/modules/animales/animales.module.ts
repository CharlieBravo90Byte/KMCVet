import { Module } from '@nestjs/common';
import { AnimalesController } from './animales.controller';
import { AnimalesService } from './animales.service';

@Module({
  controllers: [AnimalesController],
  providers: [AnimalesService],
})
export class AnimalesModule {}
