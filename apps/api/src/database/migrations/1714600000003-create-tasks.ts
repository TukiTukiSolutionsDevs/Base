import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Crea tasks: recordatorios / próximas acciones.
 * `pipeline_entry_id` es nullable (tareas libres del usuario sin empresa).
 * Cuando hay pipeline_entry_id → ON DELETE CASCADE.
 */
export class CreateTasks1714600000003 implements MigrationInterface {
  name = 'CreateTasks1714600000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE tasks (
        id                  BIGSERIAL PRIMARY KEY,
        pipeline_entry_id   BIGINT,
        organization        VARCHAR(64) NOT NULL,
        user_id             BIGINT      NOT NULL,
        description         TEXT        NOT NULL,
        type                VARCHAR(32) NOT NULL,
        due_at              TIMESTAMPTZ NOT NULL,
        completed_at        TIMESTAMPTZ,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_tasks_type CHECK (
          type IN ('CALL','EMAIL','MEETING','RESEARCH','OTHER')
        ),
        CONSTRAINT fk_tasks_pipeline_entry
          FOREIGN KEY (pipeline_entry_id) REFERENCES pipeline_entries(id) ON DELETE CASCADE
        -- NOTE: FK a users(id) omitida; ver pipeline-entries migration.
      );
    `);
    await queryRunner.query(
      `CREATE INDEX idx_tasks_org_user_due ON tasks (organization, user_id, due_at);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_tasks_entry_completed ON tasks (pipeline_entry_id, completed_at);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tasks_entry_completed;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tasks_org_user_due;`);
    await queryRunner.query(`DROP TABLE IF EXISTS tasks;`);
  }
}
