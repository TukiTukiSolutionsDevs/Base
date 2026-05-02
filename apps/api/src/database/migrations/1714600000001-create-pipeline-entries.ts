import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Crea pipeline_entries: empresas que un usuario está siguiendo en una organización.
 *
 * - `company_ruc` es FK lógica (sin REFERENCES) a companies.ruc; el ETL puede recargar
 *   la tabla `companies` y queremos preservar el seguimiento.
 * - `user_id` es FK lógica (sin REFERENCES) a users.id. La tabla `users` la crea el
 *   AuthService al arranque (`CREATE TABLE IF NOT EXISTS`), después de que corren las
 *   migrations, así que no podemos declarar la FK física sin invertir el orden.
 * - UNIQUE(company_ruc, organization): una empresa solo aparece una vez por org.
 */
export class CreatePipelineEntries1714600000001 implements MigrationInterface {
  name = 'CreatePipelineEntries1714600000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE pipeline_entries (
        id                       BIGSERIAL PRIMARY KEY,
        company_ruc              VARCHAR(11) NOT NULL,
        organization             VARCHAR(64) NOT NULL,
        user_id                  BIGINT      NOT NULL,
        status                   VARCHAR(32) NOT NULL DEFAULT 'IN_SIGHT',
        value_hypothesis         TEXT,
        lost_reason              TEXT,
        entered_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_contact_at          TIMESTAMPTZ,
        last_status_change_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_pipeline_entries_company_org UNIQUE (company_ruc, organization),
        CONSTRAINT chk_pipeline_entries_status CHECK (
          status IN ('IN_SIGHT','CONTACTED','IN_CONVERSATION','PROPOSAL','WON','LOST')
        )
        -- NOTE: FK a users(id) intencionalmente OMITIDA. La tabla users la crea
        -- AuthService.bootstrap() al arrancar la app (CREATE TABLE IF NOT EXISTS),
        -- DESPUÉS de que corren las migrations. Mantener user_id como BIGINT NOT NULL
        -- es suficiente; la integridad la garantiza la app.
      );
    `);
    await queryRunner.query(
      `CREATE INDEX idx_pipeline_entries_org_status ON pipeline_entries (organization, status);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_pipeline_entries_org_lastcontact ON pipeline_entries (organization, last_contact_at);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_pipeline_entries_org_lastcontact;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_pipeline_entries_org_status;`);
    await queryRunner.query(`DROP TABLE IF EXISTS pipeline_entries;`);
  }
}
