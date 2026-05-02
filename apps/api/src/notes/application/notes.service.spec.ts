import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { NotesService } from './notes.service';
import { NotesRepository } from '../infrastructure/notes.repository';
import { NoteEntity } from '../domain/note.entity';

const ORG = 'acme';
const USER = '7';
const ENTRY_ID = '42';

const buildNote = (over: Partial<NoteEntity> = {}): NoteEntity => ({
  id: '1',
  pipelineEntryId: ENTRY_ID,
  organization: ORG,
  userId: USER,
  body: 'una nota',
  createdAt: new Date('2026-05-01T00:00:00Z'),
  updatedAt: new Date('2026-05-01T00:00:00Z'),
  ...over,
});

describe('NotesService', () => {
  let service: NotesService;
  let repo: jest.Mocked<NotesRepository>;

  beforeEach(async () => {
    const repoMock: Partial<jest.Mocked<NotesRepository>> = {
      insert: jest.fn(),
      findByIdAndOrganization: jest.fn(),
      findByPipelineEntry: jest.fn(),
      updateScoped: jest.fn(),
      deleteScoped: jest.fn(),
    };

    const mod = await Test.createTestingModule({
      providers: [
        NotesService,
        { provide: NotesRepository, useValue: repoMock },
      ],
    }).compile();

    service = mod.get(NotesService);
    repo = mod.get(NotesRepository) as jest.Mocked<NotesRepository>;
  });

  describe('create', () => {
    it('crea note con org/user/entry/body', async () => {
      const note = buildNote();
      repo.insert.mockResolvedValue(note);

      const result = await service.create(ORG, USER, ENTRY_ID, 'una nota');

      expect(repo.insert).toHaveBeenCalledWith({
        organization: ORG,
        userId: USER,
        pipelineEntryId: ENTRY_ID,
        body: 'una nota',
      });
      expect(result).toBe(note);
    });

    it('throw BadRequestException si body es vacío/whitespace', async () => {
      await expect(service.create(ORG, USER, ENTRY_ID, '   ')).rejects.toThrow(BadRequestException);
      expect(repo.insert).not.toHaveBeenCalled();
    });
  });

  describe('listByPipelineEntry', () => {
    it('delega al repo (DESC por createdAt)', async () => {
      const notes = [buildNote()];
      repo.findByPipelineEntry.mockResolvedValue(notes);

      const result = await service.listByPipelineEntry(ORG, ENTRY_ID);

      expect(repo.findByPipelineEntry).toHaveBeenCalledWith(ORG, ENTRY_ID);
      expect(result).toBe(notes);
    });
  });

  describe('update', () => {
    it('actualiza body si existe', async () => {
      repo.findByIdAndOrganization.mockResolvedValue(buildNote());
      repo.updateScoped.mockResolvedValue(buildNote({ body: 'cambio' }));

      await service.update(ORG, '1', 'cambio');

      expect(repo.updateScoped).toHaveBeenCalledWith(ORG, '1', { body: 'cambio' });
    });

    it('throw NotFoundException si no existe', async () => {
      repo.findByIdAndOrganization.mockResolvedValue(null);
      await expect(service.update(ORG, '1', 'x')).rejects.toThrow(NotFoundException);
    });

    it('throw BadRequestException si body es vacío/whitespace', async () => {
      await expect(service.update(ORG, '1', '   ')).rejects.toThrow(BadRequestException);
      expect(repo.findByIdAndOrganization).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('borra si existe en la org', async () => {
      repo.findByIdAndOrganization.mockResolvedValue(buildNote());
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
