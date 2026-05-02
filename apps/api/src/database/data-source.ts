import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { CompanyEntity } from '../companies/domain/company.entity';
import { UserEntity } from '../auth/domain/user.entity';
import { PipelineEntryEntity } from '../pipeline/domain/pipeline-entry.entity';
import { InteractionEntity } from '../interactions/domain/interaction.entity';
import { TaskEntity } from '../tasks/domain/task.entity';
import { NoteEntity } from '../notes/domain/note.entity';
import { ContactEntity } from '../contacts/domain/contact.entity';

/**
 * DataSource para el CLI de TypeORM (migrations).
 *
 * Lee POSTGRES_* directamente de process.env. Para correr el CLI cargando el .env del root
 * del monorepo:
 *   node --env-file=../../.env ./node_modules/typeorm/cli.js -d ./dist/database/data-source.js migration:run
 *
 * o vía npm script `migration:run` (ver package.json).
 *
 * `synchronize: false` siempre — el schema lo manejan migrations + el ETL (companies/users).
 */
export const AppDataSource = new DataSource({
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
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  migrationsTableName: 'tuki_migrations',
  synchronize: false,
  logging: ['error', 'warn', 'migration'],
});
