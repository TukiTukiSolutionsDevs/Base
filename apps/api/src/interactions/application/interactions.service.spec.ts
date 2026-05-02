import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { InteractionsService } from './interactions.service';
import { InteractionsRepository } from '../infrastructure/interactions.repository';
import { InteractionEntity } from '../domain/interaction.entity';
import { InteractionType } from '../domain/interaction-type';
import { PipelineEntryEntity } from '../../pipeline/domain/pipeline-entry.entity';
import { PipelineStatus } from '../../pipeline/domain/pipeline-status';

const ORG = 'acme';
const USER = '7';
const ENTRY_ID = '42';

const buildPipelineEntry = (over: Partial<PipelineEntryEntity> = {}): PipelineEntryEntity => ({
  id: ENTRY_ID,
  companyRuc: '20123456789',
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

const buildInteraction = (over: Partial<InteractionEntity> = {}): InteractionEntity => ({
  id: '100',
  pipelineEntryId: ENTRY_ID,
  organization: ORG,
  userId: USER,
  type: InteractionType.EMAIL,
  summary: 'Mail intro',
  detail: null,
  occurredAt: new Date('2026-04-01T10:00:00Z'),
  createdAt: new Date('2026-04-01T10:00:00Z'),
  updatedAt: new Date('2026-04-01T10:00:00Z'),
  ...over,
});

describe('InteractionsService', () => {
  let service: InteractionsService;
  let repo: jest.Mocked<InteractionsRepository>;

  // Repos mockeados que el manager.getRepository devuelve dentro de la transacción.
  let txInteractionRepo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock; delete: jest.Mock };
  let txPipelineRepo: { findOne: jest.Mock; update: jest.Mock };

  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    txInteractionRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn(),
      delete: jest.fn(),
    };
    txPipelineRepo = { findOne: jest.fn(), update: jest.fn() };

    const txManager = {
      getRepository: jest.fn((entity) => {
        if (entity === InteractionEntity) return txInteractionRepo;
        if (entity === PipelineEntryEntity) return txPipelineRepo;
        throw new Error(`unexpected entity: ${entity?.name}`);
      }),
    };

    dataSource = {
      transaction: jest.fn().mockImplementation(async (cb) => cb(txManager)),
    };

    const repoMock: Partial<jest.Mocked<InteractionsRepository>> = {
      findByIdAndOrganization: jest.fn(),
      findByPipelineEntry: jest.fn(),
    };

    const mod = await Test.createTestingModule({
      providers: [
        InteractionsService,
        { provide: InteractionsRepository, useValue: repoMock },
        { provide: getDataSourceToken(), useValue: dataSource },
      ],
    }).compile();

    service = mod.get(InteractionsService);
    repo = mod.get(InteractionsRepository) as jest.Mocked<InteractionsRepository>;
  });

  describe('create', () => {
    it('inserta interaction y propaga last_contact_at al pipeline_entry', async () => {
      txPipelineRepo.findOne.mockResolvedValue(buildPipelineEntry({ lastContactAt: null }));
      const created = buildInteraction();
      txInteractionRepo.save.mockResolvedValue(created);

      const occurredAt = new Date('2026-04-15T12:00:00Z');
      const result = await service.create(
        ORG,
        USER,
        ENTRY_ID,
        InteractionType.EMAIL,
        'Mail intro',
        undefined,
        occurredAt,
      );

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(txInteractionRepo.save).toHaveBeenCalledTimes(1);
      expect(txPipelineRepo.update).toHaveBeenCalledWith(
        { id: ENTRY_ID, organization: ORG },
        expect.objectContaining({ lastContactAt: occurredAt }),
      );
      // No promoción → status no cambia
      expect(txPipelineRepo.update.mock.calls[0][1]).not.toHaveProperty('status');
      expect(result).toBe(created);
    });

    it('si occurredAt no viene, usa NOW', async () => {
      txPipelineRepo.findOne.mockResolvedValue(buildPipelineEntry());
      txInteractionRepo.save.mockResolvedValue(buildInteraction());

      const before = Date.now();
      await service.create(ORG, USER, ENTRY_ID, InteractionType.CALL, 'llamada');
      const after = Date.now();

      const saved = txInteractionRepo.save.mock.calls[0][0];
      expect(saved.occurredAt).toBeInstanceOf(Date);
      expect(saved.occurredAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(saved.occurredAt.getTime()).toBeLessThanOrEqual(after);
    });

    it('last_contact_at = MAX(actual, occurredAt) — preserva el más reciente', async () => {
      const lastContact = new Date('2026-05-01T00:00:00Z');
      txPipelineRepo.findOne.mockResolvedValue(buildPipelineEntry({ lastContactAt: lastContact }));
      txInteractionRepo.save.mockResolvedValue(buildInteraction());

      // Interaction más vieja que lastContact actual → no debe pisarlo.
      const occurredAt = new Date('2026-03-01T00:00:00Z');
      await service.create(
        ORG,
        USER,
        ENTRY_ID,
        InteractionType.EMAIL,
        'mail viejo cargado tarde',
        undefined,
        occurredAt,
      );

      expect(txPipelineRepo.update).toHaveBeenCalledWith(
        { id: ENTRY_ID, organization: ORG },
        expect.objectContaining({ lastContactAt: lastContact }),
      );
    });

    it('promoteToContacted=true y status=IN_SIGHT → promueve a CONTACTED', async () => {
      txPipelineRepo.findOne.mockResolvedValue(buildPipelineEntry({ status: PipelineStatus.IN_SIGHT }));
      txInteractionRepo.save.mockResolvedValue(buildInteraction());

      await service.create(
        ORG,
        USER,
        ENTRY_ID,
        InteractionType.CALL,
        'primer contacto',
        undefined,
        new Date('2026-04-15T00:00:00Z'),
        true,
      );

      const patch = txPipelineRepo.update.mock.calls[0][1];
      expect(patch.status).toBe(PipelineStatus.CONTACTED);
      expect(patch.lastStatusChangeAt).toBeInstanceOf(Date);
    });

    it('promoteToContacted=true pero status != IN_SIGHT → no cambia status', async () => {
      txPipelineRepo.findOne.mockResolvedValue(buildPipelineEntry({ status: PipelineStatus.IN_CONVERSATION }));
      txInteractionRepo.save.mockResolvedValue(buildInteraction());

      await service.create(
        ORG,
        USER,
        ENTRY_ID,
        InteractionType.CALL,
        'follow-up',
        undefined,
        new Date('2026-04-15T00:00:00Z'),
        true,
      );

      const patch = txPipelineRepo.update.mock.calls[0][1];
      expect(patch).not.toHaveProperty('status');
    });

    it('throw NotFoundException si pipeline_entry no es de la org', async () => {
      txPipelineRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create(ORG, USER, ENTRY_ID, InteractionType.EMAIL, 'x'),
      ).rejects.toThrow(NotFoundException);

      expect(txInteractionRepo.save).not.toHaveBeenCalled();
      expect(txPipelineRepo.update).not.toHaveBeenCalled();
    });

    it('persiste detail si viene', async () => {
      txPipelineRepo.findOne.mockResolvedValue(buildPipelineEntry());
      txInteractionRepo.save.mockResolvedValue(buildInteraction({ detail: 'larga descripción' }));

      await service.create(
        ORG,
        USER,
        ENTRY_ID,
        InteractionType.MEETING,
        'reunión',
        'larga descripción',
      );

      expect(txInteractionRepo.save.mock.calls[0][0].detail).toBe('larga descripción');
    });
  });

  describe('listByPipelineEntry', () => {
    it('verifica scope antes de listar y delega al repo', async () => {
      const interactions = [buildInteraction()];
      repo.findByPipelineEntry.mockResolvedValue(interactions);

      const result = await service.listByPipelineEntry(ORG, ENTRY_ID);

      expect(repo.findByPipelineEntry).toHaveBeenCalledWith(ORG, ENTRY_ID);
      expect(result).toBe(interactions);
    });
  });

  describe('delete', () => {
    it('borra y recalcula last_contact_at del parent (la interaction más reciente restante)', async () => {
      const target = buildInteraction({ id: '500' });
      txInteractionRepo.findOne
        .mockResolvedValueOnce(target) // primer findOne: por id (target)
        .mockResolvedValueOnce(buildInteraction({ id: '300', occurredAt: new Date('2026-03-15T00:00:00Z') })); // segundo: latest restante

      await service.delete(ORG, '500');

      expect(txInteractionRepo.delete).toHaveBeenCalledWith({ id: '500', organization: ORG });
      expect(txPipelineRepo.update).toHaveBeenCalledWith(
        { id: ENTRY_ID, organization: ORG },
        { lastContactAt: new Date('2026-03-15T00:00:00Z') },
      );
    });

    it('si no quedan interactions, last_contact_at se setea a NULL', async () => {
      txInteractionRepo.findOne.mockResolvedValueOnce(buildInteraction({ id: '500' })).mockResolvedValueOnce(null);

      await service.delete(ORG, '500');

      expect(txPipelineRepo.update).toHaveBeenCalledWith(
        { id: ENTRY_ID, organization: ORG },
        { lastContactAt: null },
      );
    });

    it('throw NotFoundException si no existe en la org', async () => {
      txInteractionRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.delete(ORG, '500')).rejects.toThrow(NotFoundException);

      expect(txInteractionRepo.delete).not.toHaveBeenCalled();
      expect(txPipelineRepo.update).not.toHaveBeenCalled();
    });
  });
});
