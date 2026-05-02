import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactEntity } from '../domain/contact.entity';

@Injectable()
export class ContactsRepository {
  constructor(
    @InjectRepository(ContactEntity)
    private readonly repo: Repository<ContactEntity>,
  ) {}

  async findByIdAndOrganization(
    id: string,
    organization: string,
  ): Promise<ContactEntity | null> {
    return this.repo.findOne({ where: { id, organization } });
  }

  /** Listado scopeado: primary primero, después por nombre alfabético. */
  async findByPipelineEntry(
    organization: string,
    pipelineEntryId: string,
  ): Promise<ContactEntity[]> {
    return this.repo
      .createQueryBuilder('c')
      .where('c.organization = :org', { org: organization })
      .andWhere('c.pipeline_entry_id = :pid', { pid: pipelineEntryId })
      .orderBy('c.is_primary', 'DESC')
      .addOrderBy('c.name', 'ASC')
      .addOrderBy('c.id', 'ASC')
      .getMany();
  }

  async deleteScoped(organization: string, id: string): Promise<void> {
    await this.repo.delete({ id, organization });
  }
}
