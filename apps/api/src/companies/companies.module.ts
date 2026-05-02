import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyEntity } from './domain/company.entity';
import { CompaniesRepository } from './infrastructure/companies.repository';
import { CompaniesService } from './application/companies.service';
import { CompaniesController } from './presentation/companies.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CompanyEntity])],
  controllers: [CompaniesController],
  providers: [CompaniesRepository, CompaniesService],
  exports: [CompaniesRepository],
})
export class CompaniesModule {}
