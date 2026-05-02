import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InteractionEntity } from '../interactions/domain/interaction.entity';
import { PipelineEntryEntity } from '../pipeline/domain/pipeline-entry.entity';
import { TaskEntity } from '../tasks/domain/task.entity';
import { TodayService } from './application/today.service';
import { TodayRepository } from './infrastructure/today.repository';
import { TodayController } from './presentation/today.controller';

/**
 * Módulo "Hoy": motor de smart prompts + snapshot del pipeline para la home.
 * Lee de pipeline_entries / tasks / interactions vía un repo dedicado para no
 * contaminar los repos canónicos de cada módulo con queries de reporting.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([PipelineEntryEntity, TaskEntity, InteractionEntity]),
  ],
  controllers: [TodayController],
  providers: [TodayService, TodayRepository],
})
export class TodayModule {}
