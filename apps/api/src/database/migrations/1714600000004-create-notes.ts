import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Crea notes: texto libre por empresa en pipeline.
 * Cascade ON DELETE: si la empresa sale del pipeline, sus notas desaparecen.
 */
export class CreateNotes1714600000004 implements MigrationInterface {
  name = 'CreateNotes1714600000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE notes (
        id                  BIGSERIAL PRIMARY KEY,
        pipeline_entry_id   BIGINT      NOT NULL,
        organization        VARCHAR(64) NOT NULL,
        user_id             BIGINT      NOT NULL,
        body                TEXT        NOT NULL,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_notes_pipeline_entry
          FOREIGN KEY (pipeline_entry_id) REFERENCES pipeline_entries(id) ON DELETE CASCADE
        -- NOTE: FK a users(id) omitida; ver pipeline-entries migration.
      );
    `);
    await queryRunner.query(
      `CREATE INDEX idx_notes_entry_created ON notes (pipeline_entry_id, created_at DESC);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_notes_entry_created;`);
    await queryRunner.query(`DROP TABLE IF EXISTS notes;`);
  }
}
