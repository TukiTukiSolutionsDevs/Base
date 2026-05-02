import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';
import { CompaniesModule } from './companies/companies.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/application/jwt-auth.guard';
import { PipelineModule } from './pipeline/pipeline.module';
import { InteractionsModule } from './interactions/interactions.module';
import { TasksModule } from './tasks/tasks.module';
import { NotesModule } from './notes/notes.module';
import { ContactsModule } from './contacts/contacts.module';
import { TodayModule } from './today/today.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    TypeOrmModule.forRootAsync({ useFactory: databaseConfig }),
    AuthModule,
    CompaniesModule,
    // CRM-lite (Fase 1: solo wiring, sin controllers todavía)
    PipelineModule,
    InteractionsModule,
    TasksModule,
    NotesModule,
    ContactsModule,
    TodayModule,
  ],
  providers: [
    // Guard global: TODAS las rutas requieren JWT salvo las marcadas con @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
