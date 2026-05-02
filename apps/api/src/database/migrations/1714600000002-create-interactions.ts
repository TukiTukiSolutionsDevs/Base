import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Crea interactions: log de cada contacto con una empresa en pipeline.
 * FK ON DELETE CASCADE → si la empresa sale del pipeline, sus interactions desaparecen.
 */
export class CreateInteractions1714600000002 implements MigrationInterface {
  name = 'CreateInteractions1714600000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE interactions (
        id                  BIGSERIAL PRIMARY KEY,
        pipeline_entry_id   BIGINT       NOT NULL,
        organization        VARCHAR(64)  NOT NULL,
        user_id             BIGINT       NOT NULL,
        type                VARCHAR(32)  NOT NULL,
        summary             VARCHAR(200) NOT NULL,
        detail              TEXT,
        occurred_at         TIMESTAMPTZ  NOT NULL,
        created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_interactions_type CHECK (
          type IN ('EMAIL','CALL','MEETING','LINKEDIN','OTHER')
        ),
        CONSTRAINT fk_interactions_pipeline_entry
          FOREIGN KEY (pipeline_entry_id) REFERENCES pipeline_entries(id) ON DELETE CASCADE
        -- NOTE: FK a users(id) omitida; ver pipeline-entries migration.
      );
    `);
    await queryRunner.query(
      `CREATE INDEX idx_interactions_entry_occurred ON interactions (pipeline_entry_id, occurred_at DESC);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_interactions_entry_occurred;`);
    await queryRunner.query(`DROP TABLE IF EXISTS interactions;`);
  }
}
