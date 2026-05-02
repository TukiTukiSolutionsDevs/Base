import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Crea contacts: personas dentro de las empresas en pipeline.
 *
 * `is_primary` queda con UNIQUE PARCIAL (`WHERE is_primary = true`) → a lo sumo
 * un primary por pipeline_entry. Postgres permite múltiples filas con `is_primary=false`.
 *
 * NO hay user_id: contactos son visibles por toda la organización.
 */
export class CreateContacts1714600000005 implements MigrationInterface {
  name = 'CreateContacts1714600000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE contacts (
        id                  BIGSERIAL PRIMARY KEY,
        pipeline_entry_id   BIGINT       NOT NULL,
        organization        VARCHAR(64)  NOT NULL,
        name                VARCHAR(255) NOT NULL,
        role                VARCHAR(255),
        email               VARCHAR(255),
        phone               VARCHAR(64),
        linkedin_url        VARCHAR(500),
        is_primary          BOOLEAN      NOT NULL DEFAULT FALSE,
        created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_contacts_pipeline_entry
          FOREIGN KEY (pipeline_entry_id) REFERENCES pipeline_entries(id) ON DELETE CASCADE
      );
    `);
    await queryRunner.query(
      `CREATE INDEX idx_contacts_entry ON contacts (pipeline_entry_id);`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_contacts_primary_per_entry
      ON contacts (pipeline_entry_id) WHERE is_primary = TRUE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS uq_contacts_primary_per_entry;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_contacts_entry;`);
    await queryRunner.query(`DROP TABLE IF EXISTS contacts;`);
  }
}
