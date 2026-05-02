import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InteractionEntity } from './domain/interaction.entity';
import { InteractionsRepository } from './infrastructure/interactions.repository';
import { InteractionsService } from './application/interactions.service';
import { InteractionsController } from './presentation/interactions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([InteractionEntity])],
  controllers: [InteractionsController],
  providers: [InteractionsRepository, InteractionsService],
  exports: [InteractionsRepository, InteractionsService],
})
export class InteractionsModule {}
