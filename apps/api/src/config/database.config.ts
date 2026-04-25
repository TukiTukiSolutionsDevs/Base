import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { CompanyEntity } from '../companies/domain/company.entity';
import { UserEntity } from '../auth/domain/user.entity';

export const databaseConfig = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  username: process.env.POSTGRES_USER ?? 'tuki',
  password: process.env.POSTGRES_PASSWORD ?? 'tuki_dev',
  database: process.env.POSTGRES_DB ?? 'tuki_expertia',
  entities: [CompanyEntity, UserEntity],
  synchronize: false, // schema lo maneja el ETL
  logging: ['error', 'warn'],
});
