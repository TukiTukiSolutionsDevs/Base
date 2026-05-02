import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CompanyEntity } from '../../companies/domain/company.entity';
import { CompaniesRepository } from '../../companies/infrastructure/companies.repository';
import { ContactsService } from '../../contacts/application/contacts.service';
import { TaskEntity } from '../../tasks/domain/task.entity';
import { TasksRepository } from '../../tasks/infrastructure/tasks.repository';
import { PipelineEntryEntity } from '../domain/pipeline-entry.entity';
import { PipelineStatus } from '../domain/pipeline-status';
import {
  PipelineEntriesRepository,
  PipelineFilters,
} from '../infrastructure/pipeline-entries.repository';
import {
  CompanyMiniDto,
  NextTaskDto,
  PipelineEntryDto,
} from './dto/pipeline-entry.dto';

const MS_PER_DAY = 86_400_000;

/**
 * Lógica de negocio del pipeline: estados, transiciones, scoping multi-tenant.
 * Todas las operaciones reciben `orgId` y delegan en el repo, que filtra por org.
 *
 * Las salidas se enriquecen con joins de companies + próxima tarea pendiente
 * y campos derivados (`daysInStage`, `lastInteractionAt`, `enteredStageAt`).
 */
@Injectable()
export class PipelineService {
  constructor(
    private readonly repo: PipelineEntriesRepository,
    private readonly companiesRepo: CompaniesRepository,
    private readonly tasksRepo: TasksRepository,
    private readonly contactsService: ContactsService,
  ) {}

  async create(
    orgId: string,
    userId: string,
    companyRuc: string,
    valueHypothesis?: string,
  ): Promise<PipelineEntryDto> {
    const existing = await this.repo.findByCompanyRucAndOrganization(companyRuc, orgId);
    if (existing) {
      throw new ConflictException(
        `La empresa ${companyRuc} ya está en el pipeline de la organización`,
      );
    }
    const now = new Date();
    const entity = await this.repo.insert({
      companyRuc,
      organization: orgId,
      userId,
      status: PipelineStatus.IN_SIGHT,
      valueHypothesis: valueHypothesis ?? null,
      lostReason: null,
      enteredAt: now,
      lastContactAt: null,
      lastStatusChangeAt: now,
    });

    /* Pre-cargar "Contacto principal" con datos públicos de la empresa
     * (email + primer teléfono disponible). Si no hay nada, no se crea contacto. */
    await this.seedInitialContact(orgId, entity.id, companyRuc);

    return this.enrichOne(orgId, entity);
  }

  /**
   * Si la empresa tiene email o algún teléfono cargado en `companies`,
   * crea un primer contacto marcado como `isPrimary` para ahorrarle al usuario
   * la copia manual del dato cuando recién agrega la empresa al pipeline.
   * Falla silenciosa: el pipeline entry ya quedó creado, no debe romperse por esto.
   */
  private async seedInitialContact(
    orgId: string,
    pipelineEntryId: string,
    companyRuc: string,
  ): Promise<void> {
    try {
      const [company] = await this.companiesRepo.findByRucs([companyRuc]);
      if (!company) return;

      const email = company.email?.trim() || undefined;
      const phone = this.pickPrimaryPhone(company);
      if (!email && !phone) return;

      await this.contactsService.create(
        orgId,
        pipelineEntryId,
        'Contacto principal',
        undefined, // role
        email,
        phone,
        undefined, // linkedinUrl
        true,      // isPrimary
      );
    } catch {
      /* swallow: el pipeline entry ya está creado y es lo que importa.
       * El usuario puede agregar contactos manualmente desde el drawer. */
    }
  }

  private pickPrimaryPhone(c: CompanyEntity): string | undefined {
    /* Mismo orden que muestra companies-table.component (telefono fijo primero,
     * celular como fallback) para que el contacto auto-creado refleje lo que el
     * usuario ve en el universe. */
    const candidates = [c.telefono1, c.telefono2, c.telefono3, c.celular1, c.celular2];
    for (const v of candidates) {
      const trimmed = v?.trim();
      if (trimmed) return trimmed;
    }
    return undefined;
  }

  async listByOrg(
    orgId: string,
    filters?: PipelineFilters,
  ): Promise<PipelineEntryDto[]> {
    const entries = await this.repo.findByOrgWithFilters(orgId, filters);
    return this.enrichMany(orgId, entries);
  }

  async getByIdScoped(orgId: string, id: string): Promise<PipelineEntryDto> {
    const entity = await this.getEntityByIdScoped(orgId, id);
    return this.enrichOne(orgId, entity);
  }

  async changeStatus(
    orgId: string,
    id: string,
    newStatus: PipelineStatus,
    lostReason?: string,
  ): Promise<PipelineEntryDto> {
    await this.getEntityByIdScoped(orgId, id);

    if (newStatus === PipelineStatus.LOST && !lostReason?.trim()) {
      throw new BadRequestException('lostReason es obligatorio cuando status=LOST');
    }

    const patch: Partial<PipelineEntryEntity> = {
      status: newStatus,
      lastStatusChangeAt: new Date(),
      lostReason: newStatus === PipelineStatus.LOST ? lostReason!.trim() : null,
    };
    const updated = await this.repo.updateScoped(orgId, id, patch);
    return this.enrichOne(orgId, updated);
  }

  async updateValueHypothesis(
    orgId: string,
    id: string,
    text: string,
  ): Promise<PipelineEntryDto> {
    await this.getEntityByIdScoped(orgId, id);
    const updated = await this.repo.updateScoped(orgId, id, { valueHypothesis: text });
    return this.enrichOne(orgId, updated);
  }

  async delete(orgId: string, id: string): Promise<void> {
    await this.getEntityByIdScoped(orgId, id);
    await this.repo.deleteScoped(orgId, id);
  }

  /* ---------- internals ---------- */

  private async getEntityByIdScoped(
    orgId: string,
    id: string,
  ): Promise<PipelineEntryEntity> {
    const entry = await this.repo.findByIdAndOrganization(id, orgId);
    if (!entry) {
      throw new NotFoundException(`Pipeline entry ${id} no encontrado`);
    }
    return entry;
  }

  private async enrichOne(
    orgId: string,
    entity: PipelineEntryEntity,
  ): Promise<PipelineEntryDto> {
    const [enriched] = await this.enrichMany(orgId, [entity]);
    return enriched;
  }

  private async enrichMany(
    orgId: string,
    entries: PipelineEntryEntity[],
  ): Promise<PipelineEntryDto[]> {
    if (entries.length === 0) return [];

    const rucs = Array.from(new Set(entries.map((e) => e.companyRuc)));
    const ids = entries.map((e) => e.id);

    const [companies, nextTasks] = await Promise.all([
      this.companiesRepo.findByRucs(rucs),
      this.tasksRepo.findNextPendingForEntries(orgId, ids),
    ]);

    const byRuc = new Map(companies.map((c) => [c.ruc, c]));
    const taskByEntry = new Map(
      nextTasks
        .filter((t): t is TaskEntity & { pipelineEntryId: string } => t.pipelineEntryId !== null)
        .map((t) => [t.pipelineEntryId, t]),
    );

    const now = Date.now();
    return entries.map((e) =>
      this.toDto(e, byRuc.get(e.companyRuc) ?? null, taskByEntry.get(e.id) ?? null, now),
    );
  }

  private toDto(
    e: PipelineEntryEntity,
    company: CompanyEntity | null,
    nextTask: TaskEntity | null,
    nowMs: number,
  ): PipelineEntryDto {
    const stageMs = nowMs - e.lastStatusChangeAt.getTime();
    const daysInStage = Math.max(0, Math.floor(stageMs / MS_PER_DAY));

    return {
      id: e.id,
      companyRuc: e.companyRuc,
      companyName: company?.razonSocial ?? null,
      organization: e.organization,
      userId: e.userId,
      status: e.status,
      valueHypothesis: e.valueHypothesis,
      lostReason: e.lostReason,
      enteredAt: e.enteredAt,
      enteredStageAt: e.lastStatusChangeAt,
      daysInStage,
      lastInteractionAt: e.lastContactAt,
      nextTask: nextTask ? this.toNextTaskDto(nextTask, nowMs) : null,
      company: company ? this.toCompanyMiniDto(company) : null,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    };
  }

  private toNextTaskDto(t: TaskEntity, nowMs: number): NextTaskDto {
    const due = t.dueAt.getTime();
    const diffMs = due - nowMs;
    const overdue = diffMs < 0 && t.completedAt === null;
    const overdueDays = overdue ? Math.floor((-diffMs) / MS_PER_DAY) : 0;
    const dueToday = !overdue && diffMs >= 0 && diffMs < MS_PER_DAY && this.sameDay(t.dueAt, new Date(nowMs));

    return {
      id: t.id,
      pipelineEntryId: t.pipelineEntryId,
      description: t.description,
      dueAt: t.dueAt,
      type: t.type,
      completed: t.completedAt !== null,
      completedAt: t.completedAt,
      createdAt: t.createdAt,
      overdue,
      overdueDays,
      dueToday,
    };
  }

  private toCompanyMiniDto(c: CompanyEntity): CompanyMiniDto {
    return {
      ruc: c.ruc,
      razonSocial: c.razonSocial,
      sector: c.sector,
      ciudad: c.distrito ?? c.provincia ?? null,
      empleados: c.trabajadores,
    };
  }

  private sameDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }
}
