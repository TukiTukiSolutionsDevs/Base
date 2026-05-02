import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompaniesModule } from '../companies/companies.module';
import { ContactsModule } from '../contacts/contacts.module';
import { TasksModule } from '../tasks/tasks.module';
import { PipelineEntryEntity } from './domain/pipeline-entry.entity';
import { PipelineEntriesRepository } from './infrastructure/pipeline-entries.repository';
import { PipelineService } from './application/pipeline.service';
import { PipelineController } from './presentation/pipeline.controller';

/**
 * Capa de seguimiento (CRM-lite): empresas que un usuario está prospectando.
 *
 * Importa CompaniesModule, TasksModule y ContactsModule para:
 *  - enriquecer los DTOs de salida con datos de la empresa y la próxima tarea
 *  - pre-cargar un "Contacto principal" cuando se agrega una empresa al pipeline.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([PipelineEntryEntity]),
    CompaniesModule,
    TasksModule,
    ContactsModule,
  ],
  controllers: [PipelineController],
  providers: [PipelineEntriesRepository, PipelineService],
  exports: [PipelineEntriesRepository, PipelineService],
})
export class PipelineModule {}
