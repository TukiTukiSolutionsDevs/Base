import { Test } from '@nestjs/testing';
import { InteractionType } from '../../interactions/domain/interaction-type';
import { InteractionEntity } from '../../interactions/domain/interaction.entity';
import { PipelineEntryEntity } from '../../pipeline/domain/pipeline-entry.entity';
import { PipelineStatus } from '../../pipeline/domain/pipeline-status';
import { TaskEntity } from '../../tasks/domain/task.entity';
import { TaskType } from '../../tasks/domain/task-type';
import { TodayRepository } from '../infrastructure/today.repository';
import { TodayService } from './today.service';

const ORG = 'acme';
const USER = '1';
const NOW = new Date('2026-05-01T12:00:00Z');

const buildEntry = (over: Partial<PipelineEntryEntity> = {}): PipelineEntryEntity => ({
  id: '10',
  companyRuc: '20123456789',
  organization: ORG,
  userId: USER,
  status: PipelineStatus.CONTACTED,
  valueHypothesis: null,
  lostReason: null,
  enteredAt: new Date('2026-04-01T00:00:00Z'),
  lastContactAt: new Date('2026-04-15T00:00:00Z'),
  lastStatusChangeAt: new Date('2026-04-15T00:00:00Z'),
  createdAt: new Date('2026-04-01T00:00:00Z'),
  updatedAt: new Date('2026-04-15T00:00:00Z'),
  ...over,
});

const buildTask = (over: Partial<TaskEntity> = {}): TaskEntity => ({
  id: '100',
  pipelineEntryId: '10',
  organization: ORG,
  userId: USER,
  description: 'llamar',
  type: TaskType.CALL,
  dueAt: new Date('2026-04-28T00:00:00Z'),
  completedAt: null,
  createdAt: new Date('2026-04-01T00:00:00Z'),
  updatedAt: new Date('2026-04-01T00:00:00Z'),
  ...over,
});

const buildInteraction = (over: Partial<InteractionEntity> = {}): InteractionEntity => ({
  id: '500',
  pipelineEntryId: '10',
  organization: ORG,
  userId: USER,
  type: InteractionType.EMAIL,
  summary: 'envié pitch',
  detail: null,
  occurredAt: new Date('2026-04-30T10:00:00Z'),
  createdAt: new Date('2026-04-30T10:00:00Z'),
  updatedAt: new Date('2026-04-30T10:00:00Z'),
  ...over,
});

describe('TodayService', () => {
  let service: TodayService;
  let repo: jest.Mocked<TodayRepository>;

  beforeEach(async () => {
    const repoMock: Partial<jest.Mocked<TodayRepository>> = {
      findOverdueFollowUps: jest.fn().mockResolvedValue([]),
      findColdProposals: jest.fn().mockResolvedValue([]),
      findStaleEntries: jest.fn().mockResolvedValue([]),
      findOverdueTasks: jest.fn().mockResolvedValue([]),
      findTodayMeetings: jest.fn().mockResolvedValue([]),
      pipelineSnapshot: jest.fn().mockResolvedValue([]),
      recentInteractions: jest.fn().mockResolvedValue([]),
    };

    const mod = await Test.createTestingModule({
      providers: [
        TodayService,
        { provide: TodayRepository, useValue: repoMock },
      ],
    }).compile();

    service = mod.get(TodayService);
    repo = mod.get(TodayRepository) as jest.Mocked<TodayRepository>;
  });

  describe('getAlertsSummary', () => {
    it('llama al repo con la org y el user del request', async () => {
      await service.getAlertsSummary(ORG, USER, NOW);

      expect(repo.findOverdueFollowUps).toHaveBeenCalledWith(ORG, 7);
      expect(repo.findColdProposals).toHaveBeenCalledWith(ORG, 14);
      expect(repo.findStaleEntries).toHaveBeenCalledWith(ORG, 30);
      expect(repo.findOverdueTasks).toHaveBeenCalledWith(ORG, USER);
      expect(repo.findTodayMeetings).toHaveBeenCalledWith(ORG, USER);
      expect(repo.pipelineSnapshot).toHaveBeenCalledWith(ORG);
      expect(repo.recentInteractions).toHaveBeenCalledWith(ORG, 5);
    });

    it('devuelve un DTO vacío bien formado cuando no hay datos', async () => {
      const result = await service.getAlertsSummary(ORG, USER, NOW);

      expect(result).toEqual({
        overdueFollowUps: { count: 0, entries: [] },
        coldProposals: { count: 0, entries: [] },
        staleEntries: { count: 0, entries: [] },
        overdueTasks: { count: 0, entries: [] },
        todayMeetings: { count: 0, entries: [] },
        pipelineSnapshot: [],
        recentInteractions: [],
      });
    });

    it('calcula daysSinceContact a partir de lastContactAt cuando existe', async () => {
      // lastContactAt = 2026-04-15, NOW = 2026-05-01 → 16 días.
      repo.findOverdueFollowUps.mockResolvedValue([
        buildEntry({ lastContactAt: new Date('2026-04-15T12:00:00Z') }),
      ]);

      const result = await service.getAlertsSummary(ORG, USER, NOW);

      expect(result.overdueFollowUps.count).toBe(1);
      expect(result.overdueFollowUps.entries[0].daysSinceContact).toBe(16);
    });

    it('cae a enteredAt cuando lastContactAt es null', async () => {
      // enteredAt = 2026-04-01, NOW = 2026-05-01 → 30 días.
      repo.findOverdueFollowUps.mockResolvedValue([
        buildEntry({
          lastContactAt: null,
          enteredAt: new Date('2026-04-01T12:00:00Z'),
        }),
      ]);

      const result = await service.getAlertsSummary(ORG, USER, NOW);

      expect(result.overdueFollowUps.entries[0].daysSinceContact).toBe(30);
    });

    it('staleEntries calcula daysInStatus desde lastStatusChangeAt', async () => {
      // lastStatusChangeAt = 2026-04-01, NOW = 2026-05-01 → 30 días.
      repo.findStaleEntries.mockResolvedValue([
        buildEntry({
          lastStatusChangeAt: new Date('2026-04-01T12:00:00Z'),
          status: PipelineStatus.IN_CONVERSATION,
        }),
      ]);

      const result = await service.getAlertsSummary(ORG, USER, NOW);

      expect(result.staleEntries.entries[0].daysInStatus).toBe(30);
      expect(result.staleEntries.entries[0].status).toBe(PipelineStatus.IN_CONVERSATION);
    });

    it('overdueTasks calcula daysOverdue (positivo si vencida)', async () => {
      // dueAt = 2026-04-28, NOW = 2026-05-01 → 3 días vencida.
      repo.findOverdueTasks.mockResolvedValue([
        buildTask({ dueAt: new Date('2026-04-28T12:00:00Z') }),
      ]);

      const result = await service.getAlertsSummary(ORG, USER, NOW);

      expect(result.overdueTasks.count).toBe(1);
      expect(result.overdueTasks.entries[0].daysOverdue).toBe(3);
    });

    it('limita la muestra de entries a 5 aunque count sea mayor', async () => {
      const tenEntries = Array.from({ length: 10 }, (_, i) =>
        buildEntry({ id: String(100 + i) }),
      );
      repo.findOverdueFollowUps.mockResolvedValue(tenEntries);

      const result = await service.getAlertsSummary(ORG, USER, NOW);

      expect(result.overdueFollowUps.count).toBe(10);
      expect(result.overdueFollowUps.entries).toHaveLength(5);
    });

    it('mapea recentInteractions con resumen plano', async () => {
      repo.recentInteractions.mockResolvedValue([
        buildInteraction({ id: '900', summary: 'reunión kickoff' }),
      ]);

      const result = await service.getAlertsSummary(ORG, USER, NOW);

      expect(result.recentInteractions).toEqual([
        expect.objectContaining({
          id: '900',
          summary: 'reunión kickoff',
          type: InteractionType.EMAIL,
        }),
      ]);
    });

    it('forwarda el pipelineSnapshot tal cual lo devuelve el repo', async () => {
      const snapshot = [
        { status: PipelineStatus.IN_SIGHT, count: 3 },
        { status: PipelineStatus.CONTACTED, count: 2 },
        { status: PipelineStatus.IN_CONVERSATION, count: 0 },
        { status: PipelineStatus.PROPOSAL, count: 1 },
        { status: PipelineStatus.WON, count: 0 },
        { status: PipelineStatus.LOST, count: 0 },
      ];
      repo.pipelineSnapshot.mockResolvedValue(snapshot);

      const result = await service.getAlertsSummary(ORG, USER, NOW);

      expect(result.pipelineSnapshot).toEqual(snapshot);
    });
  });
});
