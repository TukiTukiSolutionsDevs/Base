import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { CompanyEntity } from '../companies/domain/company.entity';
import { UserEntity } from '../auth/domain/user.entity';
import { PipelineEntryEntity } from '../pipeline/domain/pipeline-entry.entity';
import { InteractionEntity } from '../interactions/domain/interaction.entity';
import { TaskEntity } from '../tasks/domain/task.entity';
import { NoteEntity } from '../notes/domain/note.entity';
import { ContactEntity } from '../contacts/domain/contact.entity';

export const databaseConfig = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  username: process.env.POSTGRES_USER ?? 'tuki',
  password: process.env.POSTGRES_PASSWORD ?? 'tuki_dev',
  database: process.env.POSTGRES_DB ?? 'tuki_expertia',
  entities: [
    CompanyEntity,
    UserEntity,
    PipelineEntryEntity,
    InteractionEntity,
    TaskEntity,
    NoteEntity,
    ContactEntity,
  ],
  // synchronize: false → schema lo manejan:
  //   - companies: ETL (packages/etl/src/schema.sql)
  //   - users: bootstrap idempotente en AuthService
  //   - pipeline_entries / interactions / tasks / notes / contacts: TypeORM migrations
  //     (npm run migration:run en apps/api)
  synchronize: false,
  logging: ['error', 'warn'],
});
