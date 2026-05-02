import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InteractionEntity } from '../domain/interaction.entity';

@Injectable()
export class InteractionsRepository {
  constructor(
    @InjectRepository(InteractionEntity)
    private readonly repo: Repository<InteractionEntity>,
  ) {}

  async findByIdAndOrganization(
    id: string,
    organization: string,
  ): Promise<InteractionEntity | null> {
    return this.repo.findOne({ where: { id, organization } });
  }

  /** Listado scopeado por org y pipeline_entry, DESC por occurred_at. */
  async findByPipelineEntry(
    organization: string,
    pipelineEntryId: string,
  ): Promise<InteractionEntity[]> {
    return this.repo.find({
      where: { organization, pipelineEntryId },
      order: { occurredAt: 'DESC', id: 'DESC' },
    });
  }
}
