import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';
import { CompaniesModule } from './companies/companies.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/application/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    TypeOrmModule.forRootAsync({ useFactory: databaseConfig }),
    AuthModule,
    CompaniesModule,
  ],
  providers: [
    // Guard global: TODAS las rutas requieren JWT salvo las marcadas con @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
