import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TasksService } from '../application/tasks.service';
import { TaskType } from '../domain/task-type';
import { CreateTaskDto } from '../application/dto/create-task.dto';
import { UpdateTaskDto } from '../application/dto/update-task.dto';
import { TasksController } from './tasks.controller';

describe('TasksController', () => {
  const reqUser = { id: 'user-1', username: 'tuki', organization: 'org-1' };
  const fakeReq = { user: reqUser } as any;

  let controller: TasksController;
  const serviceMock = {
    create: jest.fn(),
    listForToday: jest.fn(),
    listByPipelineEntry: jest.fn(),
    update: jest.fn(),
    complete: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [{ provide: TasksService, useValue: serviceMock }],
    }).compile();
    controller = moduleRef.get(TasksController);
  });

  it('create() pasa los args en el orden esperado', async () => {
    serviceMock.create.mockResolvedValue({ id: '1' });
    const dueAt = new Date('2026-05-10T09:00:00Z');
    const body: CreateTaskDto = {
      description: 'llamar a Juan',
      dueAt,
      type: TaskType.CALL,
      pipelineEntryId: '42',
    };

    await controller.create(body, fakeReq);

    expect(serviceMock.create).toHaveBeenCalledWith(
      'org-1',
      'user-1',
      'llamar a Juan',
      dueAt,
      TaskType.CALL,
      '42',
    );
  });

  it('listToday() usa orgId + userId del request', async () => {
    serviceMock.listForToday.mockResolvedValue([]);
    await controller.listToday(fakeReq);
    expect(serviceMock.listForToday).toHaveBeenCalledWith('org-1', 'user-1');
  });

  it('update() con completed=true llama complete() (después de update si hay otros campos)', async () => {
    serviceMock.update.mockResolvedValue({ id: '7', description: 'nuevo' });
    serviceMock.complete.mockResolvedValue({ id: '7', completedAt: new Date() });

    const body: UpdateTaskDto = { description: 'nuevo', completed: true };
    await controller.update('7', body, fakeReq);

    expect(serviceMock.update).toHaveBeenCalledWith('org-1', '7', { description: 'nuevo' });
    expect(serviceMock.complete).toHaveBeenCalledWith('org-1', '7');
  });

  it('update() con solo completed=true salta el update sin patch', async () => {
    serviceMock.complete.mockResolvedValue({ id: '7' });
    await controller.update('7', { completed: true }, fakeReq);
    expect(serviceMock.update).not.toHaveBeenCalled();
    expect(serviceMock.complete).toHaveBeenCalledWith('org-1', '7');
  });

  it('validation: CreateTaskDto sin dueAt → 400', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    });
    await expect(
      pipe.transform(
        { description: 'x', type: TaskType.CALL },
        { type: 'body', metatype: CreateTaskDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
