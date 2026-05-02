import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { ContactEntity } from '../domain/contact.entity';
import { ContactsRepository } from '../infrastructure/contacts.repository';
import { PipelineEntryEntity } from '../../pipeline/domain/pipeline-entry.entity';

/**
 * Patch permitido para `update`. Excluye id, organization, pipelineEntryId, createdAt, updatedAt
 * (ownership + claves inmutables).
 */
export interface ContactUpdatePatch {
  name?: string;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedinUrl?: string | null;
  isPrimary?: boolean;
}

const ALLOWED_UPDATE_FIELDS = [
  'name',
  'role',
  'email',
  'phone',
  'linkedinUrl',
  'isPrimary',
] as const;

/**
 * ContactsService.
 *
 * Multi-tenancy: scopeado por `orgId`. Los contactos NO tienen `userId` (visibilidad
 * compartida dentro de la org).
 *
 * Reglas `is_primary`:
 * - A lo sumo un contacto primary por pipeline_entry (UNIQUE parcial en DB).
 * - Cuando un contacto pasa a ser primary, hacemos UPDATE masivo `is_primary=false`
 *   sobre los demás del mismo entry, todo dentro de una transacción para evitar
 *   violar la constraint en una pasada.
 */
@Injectable()
export class ContactsService {
  constructor(
    private readonly repo: ContactsRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async create(
    orgId: string,
    pipelineEntryId: string,
    name: string,
    role?: string,
    email?: string,
    phone?: string,
    linkedinUrl?: string,
    isPrimary?: boolean,
  ): Promise<ContactEntity> {
    if (!name?.trim()) {
      throw new BadRequestException('El nombre del contacto no puede estar vacío');
    }

    return this.dataSource.transaction(async (manager) => {
      const pipelineRepo = manager.getRepository(PipelineEntryEntity);
      const contactRepo = manager.getRepository(ContactEntity);

      const entry = await pipelineRepo.findOne({
        where: { id: pipelineEntryId, organization: orgId },
      });
      if (!entry) {
        throw new NotFoundException(
          `Pipeline entry ${pipelineEntryId} no encontrado en la organización`,
        );
      }

      if (isPrimary) {
        await this.unsetCurrentPrimary(manager, orgId, pipelineEntryId);
      }

      return contactRepo.save(
        contactRepo.create({
          organization: orgId,
          pipelineEntryId,
          name,
          role: role ?? null,
          email: email ?? null,
          phone: phone ?? null,
          linkedinUrl: linkedinUrl ?? null,
          isPrimary: !!isPrimary,
        }),
      );
    });
  }

  /** Listado scopeado por pipeline_entry. Primary primero, después nombre. */
  listByPipelineEntry(orgId: string, pipelineEntryId: string): Promise<ContactEntity[]> {
    return this.repo.findByPipelineEntry(orgId, pipelineEntryId);
  }

  async update(
    orgId: string,
    id: string,
    partial: ContactUpdatePatch,
  ): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      const contactRepo = manager.getRepository(ContactEntity);

      const existing = await contactRepo.findOne({ where: { id, organization: orgId } });
      if (!existing) throw new NotFoundException(`Contact ${id} no encontrado`);

      const sanitized: ContactUpdatePatch = {};
      for (const key of ALLOWED_UPDATE_FIELDS) {
        if (partial[key] !== undefined) {
          (sanitized[key] as unknown) = partial[key];
        }
      }

      // Si el patch promueve a primary y todavía no lo era, primero desmarcar al previo.
      if (sanitized.isPrimary === true && !existing.isPrimary) {
        await this.unsetCurrentPrimary(manager, orgId, existing.pipelineEntryId);
      }

      await contactRepo.update({ id, organization: orgId }, sanitized);
    });
  }

  /**
   * Marca un contacto como primary explícitamente. Si ya lo era, no hace nada raro.
   */
  async setPrimary(orgId: string, id: string): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      const contactRepo = manager.getRepository(ContactEntity);

      const existing = await contactRepo.findOne({ where: { id, organization: orgId } });
      if (!existing) throw new NotFoundException(`Contact ${id} no encontrado`);

      await this.unsetCurrentPrimary(manager, orgId, existing.pipelineEntryId);
      await contactRepo.update({ id, organization: orgId }, { isPrimary: true });
    });
  }

  async delete(orgId: string, id: string): Promise<void> {
    const existing = await this.repo.findByIdAndOrganization(id, orgId);
    if (!existing) throw new NotFoundException(`Contact ${id} no encontrado`);
    await this.repo.deleteScoped(orgId, id);
  }

  /**
   * Helper transaccional: pone is_primary=false en todos los contactos del entry
   * que actualmente sean primary. UPDATE masivo guiado por la constraint UNIQUE parcial.
   */
  private async unsetCurrentPrimary(
    manager: EntityManager,
    organization: string,
    pipelineEntryId: string,
  ): Promise<void> {
    const contactRepo = manager.getRepository(ContactEntity);
    await contactRepo.update(
      { organization, pipelineEntryId, isPrimary: true },
      { isPrimary: false },
    );
  }
}
