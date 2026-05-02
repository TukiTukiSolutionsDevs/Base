import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NoteEntity } from '../domain/note.entity';
import { NotesRepository } from '../infrastructure/notes.repository';

@Injectable()
export class NotesService {
  constructor(private readonly repo: NotesRepository) {}

  async create(
    orgId: string,
    userId: string,
    pipelineEntryId: string,
    body: string,
  ): Promise<NoteEntity> {
    if (!body?.trim()) {
      throw new BadRequestException('El body de la nota no puede estar vacío');
    }
    return this.repo.insert({
      organization: orgId,
      userId,
      pipelineEntryId,
      body,
    });
  }

  /** Listado scopeado por pipeline_entry. DESC por createdAt. */
  listByPipelineEntry(orgId: string, pipelineEntryId: string): Promise<NoteEntity[]> {
    return this.repo.findByPipelineEntry(orgId, pipelineEntryId);
  }

  async update(orgId: string, id: string, body: string): Promise<NoteEntity> {
    if (!body?.trim()) {
      throw new BadRequestException('El body de la nota no puede estar vacío');
    }
    const existing = await this.repo.findByIdAndOrganization(id, orgId);
    if (!existing) throw new NotFoundException(`Note ${id} no encontrada`);
    return this.repo.updateScoped(orgId, id, { body });
  }

  async delete(orgId: string, id: string): Promise<void> {
    const existing = await this.repo.findByIdAndOrganization(id, orgId);
    if (!existing) throw new NotFoundException(`Note ${id} no encontrada`);
    await this.repo.deleteScoped(orgId, id);
  }
}
