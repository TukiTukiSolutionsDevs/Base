import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskEntity } from './domain/task.entity';
import { TasksRepository } from './infrastructure/tasks.repository';
import { TasksService } from './application/tasks.service';
import { TasksController } from './presentation/tasks.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TaskEntity])],
  controllers: [TasksController],
  providers: [TasksRepository, TasksService],
  exports: [TasksRepository, TasksService],
})
export class TasksModule {}
