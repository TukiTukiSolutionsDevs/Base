import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { InteractionsService } from '../application/interactions.service';
import { InteractionType } from '../domain/interaction-type';
import { CreateInteractionDto } from '../application/dto/create-interaction.dto';
import { InteractionsController } from './interactions.controller';

describe('InteractionsController', () => {
  const reqUser = { id: 'user-1', username: 'tuki', organization: 'org-1' };
  const fakeReq = { user: reqUser } as any;

  let controller: InteractionsController;
  const serviceMock = {
    create: jest.fn(),
    listByPipelineEntry: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [InteractionsController],
      providers: [{ provide: InteractionsService, useValue: serviceMock }],
    }).compile();
    controller = moduleRef.get(InteractionsController);
  });

  it('create() expande el DTO y reenvía args al service en orden', async () => {
    serviceMock.create.mockResolvedValue({ id: '5' });
    const occurredAt = new Date('2026-04-01T12:00:00Z');
    const body: CreateInteractionDto = {
      type: InteractionType.EMAIL,
      summary: 'Mail enviado',
      detail: 'detalle',
      occurredAt,
      promoteToContacted: true,
    };

    await controller.create('42', body, fakeReq);

    expect(serviceMock.create).toHaveBeenCalledWith(
      'org-1',
      'user-1',
      '42',
      InteractionType.EMAIL,
      'Mail enviado',
      'detalle',
      occurredAt,
      true,
    );
  });

  it('list() pasa orgId + entryId', async () => {
    serviceMock.listByPipelineEntry.mockResolvedValue([]);
    await controller.list('42', fakeReq);
    expect(serviceMock.listByPipelineEntry).toHaveBeenCalledWith('org-1', '42');
  });

  it('validation: rechaza body sin summary', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    });
    await expect(
      pipe.transform(
        { type: InteractionType.EMAIL },
        { type: 'body', metatype: CreateInteractionDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('validation: rechaza type fuera del enum', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    });
    await expect(
      pipe.transform(
        { type: 'NOT_A_TYPE', summary: 'x' },
        { type: 'body', metatype: CreateInteractionDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
