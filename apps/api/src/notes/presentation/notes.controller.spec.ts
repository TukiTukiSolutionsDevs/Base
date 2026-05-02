import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { NotesService } from '../application/notes.service';
import { CreateNoteDto } from '../application/dto/create-note.dto';
import { NotesController } from './notes.controller';

describe('NotesController', () => {
  const reqUser = { id: 'user-1', username: 'tuki', organization: 'org-1' };
  const fakeReq = { user: reqUser } as any;

  let controller: NotesController;
  const serviceMock = {
    create: jest.fn(),
    listByPipelineEntry: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [NotesController],
      providers: [{ provide: NotesService, useValue: serviceMock }],
    }).compile();
    controller = moduleRef.get(NotesController);
  });

  describe('happy paths', () => {
    it('create() delega con orgId, userId, entryId, body', async () => {
      serviceMock.create.mockResolvedValue({ id: '1' });

      await controller.create('42', { body: 'una nota' }, fakeReq);

      expect(serviceMock.create).toHaveBeenCalledWith('org-1', 'user-1', '42', 'una nota');
    });

    it('list() pasa orgId y entryId', async () => {
      serviceMock.listByPipelineEntry.mockResolvedValue([]);
      await controller.list('42', fakeReq);
      expect(serviceMock.listByPipelineEntry).toHaveBeenCalledWith('org-1', '42');
    });

    it('update() llama service.update', async () => {
      serviceMock.update.mockResolvedValue({ id: '1' });
      await controller.update('1', { body: 'editado' }, fakeReq);
      expect(serviceMock.update).toHaveBeenCalledWith('org-1', '1', 'editado');
    });
  });

  describe('validation', () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    });

    it('rechaza CreateNoteDto con body vacío', async () => {
      await expect(
        pipe.transform({ body: '' }, { type: 'body', metatype: CreateNoteDto }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza CreateNoteDto sin body', async () => {
      await expect(
        pipe.transform({}, { type: 'body', metatype: CreateNoteDto }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
