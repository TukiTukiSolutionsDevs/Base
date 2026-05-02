import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PipelineService } from './pipeline.service';
import { PipelineEntriesRepository } from '../infrastructure/pipeline-entries.repository';
import { PipelineStatus } from '../domain/pipeline-status';
import { PipelineEntryEntity } from '../domain/pipeline-entry.entity';
import { CompaniesRepository } from '../../companies/infrastructure/companies.repository';
import { ContactsService } from '../../contacts/application/contacts.service';
import { TasksRepository } from '../../tasks/infrastructure/tasks.repository';
import { CompanyEntity } from '../../companies/domain/company.entity';
import { TaskEntity } from '../../tasks/domain/task.entity';
import { TaskType } from '../../tasks/domain/task-type';

const ORG = 'acme';
const USER = '1';
const RUC = '20123456789';

const buildEntry = (over: Partial<PipelineEntryEntity> = {}): PipelineEntryEntity => ({
  id: '10',
  companyRuc: RUC,
  organization: ORG,
  userId: USER,
  status: PipelineStatus.IN_SIGHT,
  valueHypothesis: null,
  lostReason: null,
  enteredAt: new Date('2026-01-01T00:00:00Z'),
  lastContactAt: null,
  lastStatusChangeAt: new Date('2026-01-01T00:00:00Z'),
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  ...over,
});

const buildCompany = (over: Partial<CompanyEntity> = {}): CompanyEntity => ({
  id: '1',
  ruc: RUC,
  razonSocial: 'ACME PERU SAC',
  nombreComercial: null,
  indiceRiesgo: null,
  estado: null,
  tipo: null,
  descripcion: null,
  sector: 'Tecnología',
  macrosector: null,
  productos: null,
  tamano: null,
  direccion: null,
  distrito: 'Miraflores',
  provincia: null,
  departamento: null,
  telefono1: null,
  telefono2: null,
  telefono3: null,
  celular1: null,
  celular2: null,
  email: null,
  fechaFundacion: null,
  locales: null,
  trabajadores: 50,
  origen: null,
  paisHolding: null,
  estatal: null,
  privadaPublica: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  ...over,
});

const buildTask = (over: Partial<TaskEntity> = {}): TaskEntity => ({
  id: '99',
  pipelineEntryId: '10',
  organization: ORG,
  userId: USER,
  description: 'Mandar email frío',
  type: 'EMAIL' as TaskType,
  dueAt: new Date('2026-02-01T00:00:00Z'),
  completedAt: null,
  createdAt: new Date('2026-01-15T00:00:00Z'),
  updatedAt: new Date('2026-01-15T00:00:00Z'),
  ...over,
});

describe('PipelineService', () => {
  let service: PipelineService;
  let repo: jest.Mocked<PipelineEntriesRepository>;
  let companiesRepo: jest.Mocked<CompaniesRepository>;
  let tasksRepo: jest.Mocked<TasksRepository>;
  let contactsService: jest.Mocked<ContactsService>;

  beforeEach(async () => {
    const repoMock: Partial<jest.Mocked<PipelineEntriesRepository>> = {
      findByCompanyRucAndOrganization: jest.fn(),
      findByIdAndOrganization: jest.fn(),
      insert: jest.fn(),
      findByOrgWithFilters: jest.fn(),
      updateScoped: jest.fn(),
      deleteScoped: jest.fn(),
    };
    const companiesMock: Partial<jest.Mocked<CompaniesRepository>> = {
      findByRucs: jest.fn().mockResolvedValue([]),
    };
    const tasksMock: Partial<jest.Mocked<TasksRepository>> = {
      findNextPendingForEntries: jest.fn().mockResolvedValue([]),
    };
    const contactsMock: Partial<jest.Mocked<ContactsService>> = {
      create: jest.fn().mockResolvedValue({} as never),
    };

    const mod = await Test.createTestingModule({
      providers: [
        PipelineService,
        { provide: PipelineEntriesRepository, useValue: repoMock },
        { provide: CompaniesRepository, useValue: companiesMock },
        { provide: TasksRepository, useValue: tasksMock },
        { provide: ContactsService, useValue: contactsMock },
      ],
    }).compile();

    service = mod.get(PipelineService);
    repo = mod.get(PipelineEntriesRepository) as jest.Mocked<PipelineEntriesRepository>;
    companiesRepo = mod.get(CompaniesRepository) as jest.Mocked<CompaniesRepository>;
    tasksRepo = mod.get(TasksRepository) as jest.Mocked<TasksRepository>;
    contactsService = mod.get(ContactsService) as jest.Mocked<ContactsService>;
  });

  describe('create', () => {
    it('crea entry con status default IN_SIGHT y devuelve DTO enriquecido', async () => {
      repo.findByCompanyRucAndOrganization.mockResolvedValue(null);
      const created = buildEntry();
      repo.insert.mockResolvedValue(created);

      const result = await service.create(ORG, USER, RUC);

      expect(repo.findByCompanyRucAndOrganization).toHaveBeenCalledWith(RUC, ORG);
      expect(repo.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          organization: ORG,
          userId: USER,
          companyRuc: RUC,
          status: PipelineStatus.IN_SIGHT,
          valueHypothesis: null,
          lostReason: null,
        }),
      );
      expect(result.id).toBe(created.id);
      expect(result.companyRuc).toBe(RUC);
      expect(result.daysInStage).toBeGreaterThanOrEqual(0);
      expect(result.lastInteractionAt).toBeNull();
      expect(result.enteredStageAt).toEqual(created.lastStatusChangeAt);
    });

    it('persiste valueHypothesis si viene', async () => {
      repo.findByCompanyRucAndOrganization.mockResolvedValue(null);
      repo.insert.mockResolvedValue(buildEntry({ valueHypothesis: 'mvp 4 semanas' }));

      await service.create(ORG, USER, RUC, 'mvp 4 semanas');

      expect(repo.insert).toHaveBeenCalledWith(
        expect.objectContaining({ valueHypothesis: 'mvp 4 semanas' }),
      );
    });

    it('throw ConflictException si la empresa ya está en pipeline de la org', async () => {
      repo.findByCompanyRucAndOrganization.mockResolvedValue(buildEntry());

      await expect(service.create(ORG, USER, RUC)).rejects.toThrow(ConflictException);
      expect(repo.insert).not.toHaveBeenCalled();
    });

    it('seed: crea Contacto principal si la empresa tiene email + teléfono', async () => {
      repo.findByCompanyRucAndOrganization.mockResolvedValue(null);
      repo.insert.mockResolvedValue(buildEntry({ id: '42' }));
      companiesRepo.findByRucs.mockResolvedValue([
        buildCompany({ email: 'info@acme.pe', telefono1: '(1)1234567' }),
      ]);

      await service.create(ORG, USER, RUC);

      expect(contactsService.create).toHaveBeenCalledWith(
        ORG, '42', 'Contacto principal', undefined,
        'info@acme.pe', '(1)1234567', undefined, true,
      );
    });

    it('seed: prioriza telefono1 sobre celular (consistencia con universe)', async () => {
      repo.findByCompanyRucAndOrganization.mockResolvedValue(null);
      repo.insert.mockResolvedValue(buildEntry({ id: '7' }));
      companiesRepo.findByRucs.mockResolvedValue([
        buildCompany({
          email: null,
          telefono1: '(1)1234567',
          celular1: '999111222',
        }),
      ]);

      await service.create(ORG, USER, RUC);

      expect(contactsService.create).toHaveBeenCalledWith(
        ORG, '7', 'Contacto principal', undefined,
        undefined, '(1)1234567', undefined, true,
      );
    });

    it('seed: cae a celular si no hay teléfono fijo', async () => {
      repo.findByCompanyRucAndOrganization.mockResolvedValue(null);
      repo.insert.mockResolvedValue(buildEntry({ id: '8' }));
      companiesRepo.findByRucs.mockResolvedValue([
        buildCompany({
          email: null,
          telefono1: null, telefono2: null, telefono3: null,
          celular1: '987654321',
        }),
      ]);

      await service.create(ORG, USER, RUC);

      expect(contactsService.create).toHaveBeenCalledWith(
        ORG, '8', 'Contacto principal', undefined,
        undefined, '987654321', undefined, true,
      );
    });

    it('seed: NO crea contacto si la empresa no tiene email ni teléfonos', async () => {
      repo.findByCompanyRucAndOrganization.mockResolvedValue(null);
      repo.insert.mockResolvedValue(buildEntry());
      companiesRepo.findByRucs.mockResolvedValue([
        buildCompany({
          email: null, telefono1: null, telefono2: null, telefono3: null,
          celular1: null, celular2: null,
        }),
      ]);

      await service.create(ORG, USER, RUC);

      expect(contactsService.create).not.toHaveBeenCalled();
    });

    it('seed: NO crea contacto si no existe la empresa en companies', async () => {
      repo.findByCompanyRucAndOrganization.mockResolvedValue(null);
      repo.insert.mockResolvedValue(buildEntry());
      companiesRepo.findByRucs.mockResolvedValue([]);

      await service.create(ORG, USER, RUC);

      expect(contactsService.create).not.toHaveBeenCalled();
    });

    it('seed: si falla la creación del contacto, el create del entry NO falla', async () => {
      repo.findByCompanyRucAndOrganization.mockResolvedValue(null);
      const created = buildEntry();
      repo.insert.mockResolvedValue(created);
      companiesRepo.findByRucs.mockResolvedValue([buildCompany({ email: 'a@b.c' })]);
      contactsService.create.mockRejectedValue(new Error('boom'));

      const result = await service.create(ORG, USER, RUC);

      expect(result.id).toBe(created.id);
    });
  });

  describe('listByOrg', () => {
    it('delega al repo con la org y enriquece con company + nextTask', async () => {
      const stageEnter = new Date(Date.now() - 5 * 86_400_000); // 5 días atrás
      const entry = buildEntry({ lastStatusChangeAt: stageEnter, lastContactAt: stageEnter });
      repo.findByOrgWithFilters.mockResolvedValue([entry]);
      companiesRepo.findByRucs.mockResolvedValue([buildCompany()]);
      tasksRepo.findNextPendingForEntries.mockResolvedValue([buildTask()]);

      const result = await service.listByOrg(ORG);

      expect(repo.findByOrgWithFilters).toHaveBeenCalledWith(ORG, undefined);
      expect(companiesRepo.findByRucs).toHaveBeenCalledWith([RUC]);
      expect(tasksRepo.findNextPendingForEntries).toHaveBeenCalledWith(ORG, [entry.id]);
      expect(result).toHaveLength(1);
      expect(result[0].companyName).toBe('ACME PERU SAC');
      expect(result[0].company?.sector).toBe('Tecnología');
      expect(result[0].daysInStage).toBe(5);
      expect(result[0].lastInteractionAt).toEqual(stageEnter);
      expect(result[0].nextTask?.description).toBe('Mandar email frío');
    });

    it('si no hay entries no consulta companies ni tasks', async () => {
      repo.findByOrgWithFilters.mockResolvedValue([]);

      const result = await service.listByOrg(ORG);

      expect(result).toEqual([]);
      expect(companiesRepo.findByRucs).not.toHaveBeenCalled();
      expect(tasksRepo.findNextPendingForEntries).not.toHaveBeenCalled();
    });

    it('pasa filtros tal cual', async () => {
      repo.findByOrgWithFilters.mockResolvedValue([]);
      const filters = {
        status: [PipelineStatus.IN_SIGHT, PipelineStatus.CONTACTED],
        staleDays: 7,
        withOverdueTask: true,
      };

      await service.listByOrg(ORG, filters);

      expect(repo.findByOrgWithFilters).toHaveBeenCalledWith(ORG, filters);
    });

    it('marca nextTask.overdue=true cuando dueAt es pasado', async () => {
      const entry = buildEntry();
      const past = new Date(Date.now() - 3 * 86_400_000);
      repo.findByOrgWithFilters.mockResolvedValue([entry]);
      tasksRepo.findNextPendingForEntries.mockResolvedValue([buildTask({ dueAt: past })]);

      const result = await service.listByOrg(ORG);

      expect(result[0].nextTask?.overdue).toBe(true);
      expect(result[0].nextTask?.overdueDays).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getByIdScoped', () => {
    it('devuelve DTO enriquecido si existe y pertenece a la org', async () => {
      const entry = buildEntry();
      repo.findByIdAndOrganization.mockResolvedValue(entry);
      companiesRepo.findByRucs.mockResolvedValue([buildCompany()]);

      const result = await service.getByIdScoped(ORG, '10');

      expect(repo.findByIdAndOrganization).toHaveBeenCalledWith('10', ORG);
      expect(result.id).toBe('10');
      expect(result.companyName).toBe('ACME PERU SAC');
    });

    it('throw NotFoundException si no existe', async () => {
      repo.findByIdAndOrganization.mockResolvedValue(null);
      await expect(service.getByIdScoped(ORG, '10')).rejects.toThrow(NotFoundException);
    });

    it('no leak: pertenece a otra org → repo devuelve null → NotFoundException', async () => {
      repo.findByIdAndOrganization.mockResolvedValue(null);
      await expect(service.getByIdScoped('other-org', '10')).rejects.toThrow(NotFoundException);
    });
  });

  describe('changeStatus', () => {
    it('actualiza status y lastStatusChangeAt=NOW', async () => {
      repo.findByIdAndOrganization.mockResolvedValue(buildEntry({ status: PipelineStatus.IN_SIGHT }));
      const updated = buildEntry({ status: PipelineStatus.CONTACTED });
      repo.updateScoped.mockResolvedValue(updated);

      const before = Date.now();
      const result = await service.changeStatus(ORG, '10', PipelineStatus.CONTACTED);
      const after = Date.now();

      expect(repo.updateScoped).toHaveBeenCalledTimes(1);
      const patch = repo.updateScoped.mock.calls[0][2];
      expect(patch.status).toBe(PipelineStatus.CONTACTED);
      expect(patch.lostReason).toBeNull();
      expect(patch.lastStatusChangeAt).toBeInstanceOf(Date);
      expect(patch.lastStatusChangeAt!.getTime()).toBeGreaterThanOrEqual(before);
      expect(patch.lastStatusChangeAt!.getTime()).toBeLessThanOrEqual(after);
      expect(result.id).toBe(updated.id);
      expect(result.status).toBe(PipelineStatus.CONTACTED);
    });

    it('LOST sin lostReason → BadRequestException', async () => {
      repo.findByIdAndOrganization.mockResolvedValue(buildEntry());
      await expect(
        service.changeStatus(ORG, '10', PipelineStatus.LOST),
      ).rejects.toThrow(BadRequestException);
      expect(repo.updateScoped).not.toHaveBeenCalled();
    });

    it('LOST con lostReason vacío/whitespace → BadRequestException', async () => {
      repo.findByIdAndOrganization.mockResolvedValue(buildEntry());
      await expect(
        service.changeStatus(ORG, '10', PipelineStatus.LOST, '   '),
      ).rejects.toThrow(BadRequestException);
    });

    it('LOST con lostReason válido → persiste motivo', async () => {
      repo.findByIdAndOrganization.mockResolvedValue(buildEntry());
      repo.updateScoped.mockResolvedValue(buildEntry({
        status: PipelineStatus.LOST,
        lostReason: 'sin presupuesto',
      }));

      await service.changeStatus(ORG, '10', PipelineStatus.LOST, 'sin presupuesto');

      expect(repo.updateScoped).toHaveBeenCalledWith(
        ORG,
        '10',
        expect.objectContaining({
          status: PipelineStatus.LOST,
          lostReason: 'sin presupuesto',
        }),
      );
    });

    it('cambio fuera de LOST limpia lostReason previo', async () => {
      repo.findByIdAndOrganization.mockResolvedValue(buildEntry({
        status: PipelineStatus.LOST,
        lostReason: 'sin presupuesto',
      }));
      repo.updateScoped.mockResolvedValue(buildEntry({ status: PipelineStatus.CONTACTED }));

      await service.changeStatus(ORG, '10', PipelineStatus.CONTACTED);

      expect(repo.updateScoped).toHaveBeenCalledWith(
        ORG,
        '10',
        expect.objectContaining({
          status: PipelineStatus.CONTACTED,
          lostReason: null,
        }),
      );
    });

    it('throw NotFoundException si no existe', async () => {
      repo.findByIdAndOrganization.mockResolvedValue(null);
      await expect(
        service.changeStatus(ORG, '10', PipelineStatus.WON),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateValueHypothesis', () => {
    it('actualiza el campo si existe', async () => {
      repo.findByIdAndOrganization.mockResolvedValue(buildEntry());
      repo.updateScoped.mockResolvedValue(buildEntry({ valueHypothesis: 'nuevo texto' }));

      await service.updateValueHypothesis(ORG, '10', 'nuevo texto');

      expect(repo.updateScoped).toHaveBeenCalledWith(ORG, '10', { valueHypothesis: 'nuevo texto' });
    });

    it('throw NotFoundException si no existe', async () => {
      repo.findByIdAndOrganization.mockResolvedValue(null);
      await expect(
        service.updateValueHypothesis(ORG, '10', 'x'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('borra si existe en la org', async () => {
      repo.findByIdAndOrganization.mockResolvedValue(buildEntry());
      repo.deleteScoped.mockResolvedValue(undefined);

      await service.delete(ORG, '10');

      expect(repo.deleteScoped).toHaveBeenCalledWith(ORG, '10');
    });

    it('throw NotFoundException si no existe', async () => {
      repo.findByIdAndOrganization.mockResolvedValue(null);
      await expect(service.delete(ORG, '10')).rejects.toThrow(NotFoundException);
      expect(repo.deleteScoped).not.toHaveBeenCalled();
    });
  });
});
