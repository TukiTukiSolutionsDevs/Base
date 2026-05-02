import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NoteEntity } from '../domain/note.entity';

@Injectable()
export class NotesRepository {
  constructor(
    @InjectRepository(NoteEntity)
    private readonly repo: Repository<NoteEntity>,
  ) {}

  async findByIdAndOrganization(
    id: string,
    organization: string,
  ): Promise<NoteEntity | null> {
    return this.repo.findOne({ where: { id, organization } });
  }

  async insert(data: Partial<NoteEntity>): Promise<NoteEntity> {
    return this.repo.save(this.repo.create(data));
  }

  /** Listado scopeado por org y pipeline_entry, DESC por createdAt. */
  async findByPipelineEntry(
    organization: string,
    pipelineEntryId: string,
  ): Promise<NoteEntity[]> {
    return this.repo.find({
      where: { organization, pipelineEntryId },
      order: { createdAt: 'DESC', id: 'DESC' },
    });
  }

  async updateScoped(
    organization: string,
    id: string,
    patch: Partial<NoteEntity>,
  ): Promise<NoteEntity> {
    await this.repo.update({ id, organization }, patch);
    const refreshed = await this.repo.findOne({ where: { id, organization } });
    if (!refreshed) {
      throw new Error(`note ${id} desapareció después del update (race?)`);
    }
    return refreshed;
  }

  async deleteScoped(organization: string, id: string): Promise<void> {
    await this.repo.delete({ id, organization });
  }
}
