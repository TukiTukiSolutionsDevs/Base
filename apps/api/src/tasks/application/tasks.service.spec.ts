import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksRepository } from '../infrastructure/tasks.repository';
import { TaskEntity } from '../domain/task.entity';
import { TaskType } from '../domain/task-type';

const ORG = 'acme';
const USER = '7';
const ENTRY_ID = '42';

const buildTask = (over: Partial<TaskEntity> = {}): TaskEntity => ({
  id: '1',
  pipelineEntryId: ENTRY_ID,
  organization: ORG,
  userId: USER,
  description: 'follow-up',
  type: TaskType.CALL,
  dueAt: new Date('2026-05-10T10:00:00Z'),
  completedAt: null,
  createdAt: new Date('2026-05-01T00:00:00Z'),
  updatedAt: new Date('2026-05-01T00:00:00Z'),
  ...over,
});

describe('TasksService', () => {
  let service: TasksService;
  let repo: jest.Mocked<TasksRepository>;

  beforeEach(async () => {
    const repoMock: Partial<jest.Mocked<TasksRepository>> = {
      insert: jest.fn(),
      findByIdAndOrganization: jest.fn(),
      findPendingForUserUntil: jest.fn(),
      findByPipelineEntry: jest.fn(),
      findNextPendingForEntry: jest.fn(),
      updateScoped: jest.fn(),
      deleteScoped: jest.fn(),
    };

    const mod = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: TasksRepository, useValue: repoMock },
      ],
    }).compile();

    service = mod.get(TasksService);
    repo = mod.get(TasksRepository) as jest.Mocked<TasksRepository>;
  });

  describe('create', () => {
    it('crea task con campos básicos', async () => {
      const task = buildTask();
      repo.insert.mockResolvedValue(task);

      const dueAt = new Date('2026-05-10T10:00:00Z');
      const result = await service.create(ORG, USER, 'follow-up', dueAt, TaskType.CALL);

      expect(repo.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          organization: ORG,
          userId: USER,
          description: 'follow-up',
          dueAt,
          type: TaskType.CALL,
          pipelineEntryId: null,
          completedAt: null,
        }),
      );
      expect(result).toBe(task);
    });

    it('asocia pipelineEntryId si viene', async () => {
      repo.insert.mockResolvedValue(buildTask());
      await service.create(ORG, USER, 'd', new Date(), TaskType.EMAIL, ENTRY_ID);
      expect(repo.insert).toHaveBeenCalledWith(
        expect.objectContaining({ pipelineEntryId: ENTRY_ID }),
      );
    });
  });

  describe('listForToday', () => {
    it('pide pendientes con dueAt <= fin del día actual, scopeadas por user+org', async () => {
      const tasks = [buildTask()];
      repo.findPendingForUserUntil.mockResolvedValue(tasks);

      const result = await service.listForToday(ORG, USER);

      expect(repo.findPendingForUserUntil).toHaveBeenCalledTimes(1);
      const [orgArg, userArg, untilArg] = repo.findPendingForUserUntil.mock.calls[0];
      expect(orgArg).toBe(ORG);
      expect(userArg).toBe(USER);
      // until debe ser el final del día actual (23:59:59.999)
      expect(untilArg).toBeInstanceOf(Date);
      const now = new Date();
      const expectedEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      expect(untilArg.getTime()).toBe(expectedEnd.getTime());
      expect(result).toBe(tasks);
    });
  });

  describe('listByPipelineEntry', () => {
    it('delega al repo (pendientes primero, después por dueAt)', async () => {
      const tasks = [buildTask()];
      repo.findByPipelineEntry.mockResolvedValue(tasks);

      const result = await service.listByPipelineEntry(ORG, ENTRY_ID);

      expect(repo.findByPipelineEntry).toHaveBeenCalledWith(ORG, ENTRY_ID);
      expect(result).toBe(tasks);
    });
  });

  describe('getNextActionForEntry', () => {
    it('devuelve la pendiente con dueAt mínimo', async () => {
      const next = buildTask({ id: '99' });
      repo.findNextPendingForEntry.mockResolvedValue(next);

      const result = await service.getNextActionForEntry(ORG, ENTRY_ID);

      expect(repo.findNextPendingForEntry).toHaveBeenCalledWith(ORG, ENTRY_ID);
      expect(result).toBe(next);
    });

    it('devuelve null si no hay próxima acción', async () => {
      repo.findNextPendingForEntry.mockResolvedValue(null);
      const result = await service.getNextActionForEntry(ORG, ENTRY_ID);
      expect(result).toBeNull();
    });
  });

  describe('complete', () => {
    it('seta completedAt = NOW', async () => {
      repo.findByIdAndOrganization.mockResolvedValue(buildTask({ completedAt: null }));
      repo.updateScoped.mockResolvedValue(buildTask({ completedAt: new Date() }));

      const before = Date.now();
      await service.complete(ORG, '1');
      const after = Date.now();

      const patch = repo.updateScoped.mock.calls[0][2];
      expect(patch.completedAt).toBeInstanceOf(Date);
      expect(patch.completedAt!.getTime()).toBeGreaterThanOrEqual(before);
      expect(patch.completedAt!.getTime()).toBeLessThanOrEqual(after);
    });

    it('throw NotFoundException si no existe', async () => {
      repo.findByIdAndOrganization.mockResolvedValue(null);
      await expect(service.complete(ORG, '1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('aplica patch parcial (description, dueAt, type)', async () => {
      repo.findByIdAndOrganization.mockResolvedValue(buildTask());
      repo.updateScoped.mockResolvedValue(buildTask({ description: 'cambio' }));

      const newDue = new Date('2026-06-01T00:00:00Z');
      await service.update(ORG, '1', { description: 'cambio', dueAt: newDue, type: TaskType.MEETING });

      expect(repo.updateScoped).toHaveBeenCalledWith(ORG, '1', {
        description: 'cambio',
        dueAt: newDue,
        type: TaskType.MEETING,
      });
    });

    it('throw NotFoundException si no existe', async () => {
      repo.findByIdAndOrganization.mockResolvedValue(null);
      await expect(service.update(ORG, '1', { description: 'x' })).rejects.toThrow(NotFoundException);
    });

    it('ignora campos no permitidos (organization, userId, id)', async () => {
      repo.findByIdAndOrganization.mockResolvedValue(buildTask());
      repo.updateScoped.mockResolvedValue(buildTask());

      // Cast a tipo del param para simular el caso runtime: si llegan campos extra,
      // el service los filtra silenciosamente (defensa en profundidad).
      await service.update(ORG, '1', {
        description: 'd',
        organization: 'evil',
        userId: 'evil',
        id: 'evil',
      } as unknown as Parameters<typeof service.update>[2]);

      const patch = repo.updateScoped.mock.calls[0][2];
      expect(patch).not.toHaveProperty('organization');
      expect(patch).not.toHaveProperty('userId');
      expect(patch).not.toHaveProperty('id');
      expect(patch.description).toBe('d');
    });
  });

  describe('delete', () => {
    it('borra si existe en la org', async () => {
      repo.findByIdAndOrganization.mockResolvedValue(buildTask());
      repo.deleteScoped.mockResolvedValue(undefined);

      await service.delete(ORG, '1');

      expect(repo.deleteScoped).toHaveBeenCalledWith(ORG, '1');
    });

    it('throw NotFoundException si no existe', async () => {
      repo.findByIdAndOrganization.mockResolvedValue(null);
      await expect(service.delete(ORG, '1')).rejects.toThrow(NotFoundException);
    });
  });
});
