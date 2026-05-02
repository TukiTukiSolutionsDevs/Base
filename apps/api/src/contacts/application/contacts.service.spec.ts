import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import { ContactsService } from './contacts.service';
import { ContactsRepository } from '../infrastructure/contacts.repository';
import { ContactEntity } from '../domain/contact.entity';
import { PipelineEntryEntity } from '../../pipeline/domain/pipeline-entry.entity';
import { PipelineStatus } from '../../pipeline/domain/pipeline-status';

const ORG = 'acme';
const ENTRY_ID = '42';

const buildContact = (over: Partial<ContactEntity> = {}): ContactEntity => ({
  id: '1',
  pipelineEntryId: ENTRY_ID,
  organization: ORG,
  name: 'Juan Pérez',
  role: null,
  email: null,
  phone: null,
  linkedinUrl: null,
  isPrimary: false,
  createdAt: new Date('2026-05-01T00:00:00Z'),
  updatedAt: new Date('2026-05-01T00:00:00Z'),
  ...over,
});

const buildPipelineEntry = (over: Partial<PipelineEntryEntity> = {}): PipelineEntryEntity => ({
  id: ENTRY_ID,
  companyRuc: '20123456789',
  organization: ORG,
  userId: '1',
  status: PipelineStatus.IN_SIGHT,
  valueHypothesis: null,
  lostReason: null,
  enteredAt: new Date(),
  lastContactAt: null,
  lastStatusChangeAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...over,
});

describe('ContactsService', () => {
  let service: ContactsService;
  let repo: jest.Mocked<ContactsRepository>;

  let txContactRepo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock; update: jest.Mock; delete: jest.Mock };
  let txPipelineRepo: { findOne: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    txContactRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    txPipelineRepo = { findOne: jest.fn() };

    const txManager = {
      getRepository: jest.fn((entity) => {
        if (entity === ContactEntity) return txContactRepo;
        if (entity === PipelineEntryEntity) return txPipelineRepo;
        throw new Error(`unexpected entity: ${entity?.name}`);
      }),
    };

    dataSource = { transaction: jest.fn().mockImplementation(async (cb) => cb(txManager)) };

    const repoMock: Partial<jest.Mocked<ContactsRepository>> = {
      findByIdAndOrganization: jest.fn(),
      findByPipelineEntry: jest.fn(),
      deleteScoped: jest.fn(),
    };

    const mod = await Test.createTestingModule({
      providers: [
        ContactsService,
        { provide: ContactsRepository, useValue: repoMock },
        { provide: getDataSourceToken(), useValue: dataSource },
      ],
    }).compile();

    service = mod.get(ContactsService);
    repo = mod.get(ContactsRepository) as jest.Mocked<ContactsRepository>;
  });

  describe('create', () => {
    it('crea contact no-primary sin tocar a otros', async () => {
      txPipelineRepo.findOne.mockResolvedValue(buildPipelineEntry());
      const created = buildContact();
      txContactRepo.save.mockResolvedValue(created);

      const result = await service.create(ORG, ENTRY_ID, 'Juan Pérez');

      expect(txContactRepo.save).toHaveBeenCalledTimes(1);
      const saved = txContactRepo.save.mock.calls[0][0];
      expect(saved).toMatchObject({
        organization: ORG,
        pipelineEntryId: ENTRY_ID,
        name: 'Juan Pérez',
        isPrimary: false,
      });
      // No update masivo si no hay primary
      expect(txContactRepo.update).not.toHaveBeenCalled();
      expect(result).toBe(created);
    });

    it('crea primary y desmarca a los demás del mismo pipeline_entry (transacción)', async () => {
      txPipelineRepo.findOne.mockResolvedValue(buildPipelineEntry());
      const created = buildContact({ isPrimary: true });
      txContactRepo.save.mockResolvedValue(created);

      await service.create(ORG, ENTRY_ID, 'María', 'CTO', 'm@x.com', undefined, undefined, true);

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      // Unset masivo de primary previos
      expect(txContactRepo.update).toHaveBeenCalledWith(
        { organization: ORG, pipelineEntryId: ENTRY_ID, isPrimary: true },
        { isPrimary: false },
      );
      expect(txContactRepo.save.mock.calls[0][0].isPrimary).toBe(true);
    });

    it('throw NotFoundException si pipeline_entry no es de la org', async () => {
      txPipelineRepo.findOne.mockResolvedValue(null);
      await expect(service.create(ORG, ENTRY_ID, 'X')).rejects.toThrow(NotFoundException);
      expect(txContactRepo.save).not.toHaveBeenCalled();
    });

    it('throw BadRequestException si name es vacío/whitespace', async () => {
      await expect(service.create(ORG, ENTRY_ID, '   ')).rejects.toThrow(BadRequestException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('persiste campos opcionales (role, email, phone, linkedinUrl)', async () => {
      txPipelineRepo.findOne.mockResolvedValue(buildPipelineEntry());
      txContactRepo.save.mockResolvedValue(buildContact());

      await service.create(
        ORG,
        ENTRY_ID,
        'Ana',
        'CEO',
        'ana@x.com',
        '+51 999',
        'https://linkedin.com/in/ana',
      );

      expect(txContactRepo.save.mock.calls[0][0]).toMatchObject({
        role: 'CEO',
        email: 'ana@x.com',
        phone: '+51 999',
        linkedinUrl: 'https://linkedin.com/in/ana',
      });
    });
  });

  describe('listByPipelineEntry', () => {
    it('delega al repo (primary primero, después nombre)', async () => {
      const list = [buildContact({ isPrimary: true })];
      repo.findByPipelineEntry.mockResolvedValue(list);

      const result = await service.listByPipelineEntry(ORG, ENTRY_ID);

      expect(repo.findByPipelineEntry).toHaveBeenCalledWith(ORG, ENTRY_ID);
      expect(result).toBe(list);
    });
  });

  describe('update', () => {
    it('aplica patch parcial sin tocar isPrimary si no está en el patch', async () => {
      txContactRepo.findOne.mockResolvedValue(buildContact());
      txContactRepo.update.mockResolvedValue({ affected: 1 });

      await service.update(ORG, '1', { name: 'Nuevo Nombre', email: 'n@x.com' });

      expect(txContactRepo.update).toHaveBeenCalledWith(
        { id: '1', organization: ORG },
        { name: 'Nuevo Nombre', email: 'n@x.com' },
      );
      // No promoción → solo el update de la fila
      expect(txContactRepo.update).toHaveBeenCalledTimes(1);
    });

    it('si isPrimary pasa a true, desmarca a los otros del mismo entry y luego setea este', async () => {
      txContactRepo.findOne.mockResolvedValue(buildContact({ isPrimary: false }));

      await service.update(ORG, '1', { isPrimary: true });

      // Dos updates: 1) unset masivo, 2) set en el target
      expect(txContactRepo.update).toHaveBeenNthCalledWith(
        1,
        { organization: ORG, pipelineEntryId: ENTRY_ID, isPrimary: true },
        { isPrimary: false },
      );
      expect(txContactRepo.update).toHaveBeenNthCalledWith(
        2,
        { id: '1', organization: ORG },
        expect.objectContaining({ isPrimary: true }),
      );
    });

    it('si isPrimary ya era true y patch lo confirma, no duplica el unset masivo', async () => {
      txContactRepo.findOne.mockResolvedValue(buildContact({ isPrimary: true }));

      await service.update(ORG, '1', { isPrimary: true, name: 'X' });

      // Solo el update de la fila, sin tocar a otros (ya es el primary).
      expect(txContactRepo.update).toHaveBeenCalledTimes(1);
      expect(txContactRepo.update).toHaveBeenCalledWith(
        { id: '1', organization: ORG },
        expect.objectContaining({ isPrimary: true, name: 'X' }),
      );
    });

    it('throw NotFoundException si no existe', async () => {
      txContactRepo.findOne.mockResolvedValue(null);
      await expect(service.update(ORG, '1', { name: 'x' })).rejects.toThrow(NotFoundException);
    });

    it('ignora campos no permitidos (organization, id, pipelineEntryId)', async () => {
      txContactRepo.findOne.mockResolvedValue(buildContact());

      // Cast a `any` para forzar el caso runtime: aunque el tipo no lo permite,
      // si por algún motivo llegara un objeto con campos extra, el service debe filtrarlos.
      await service.update(ORG, '1', {
        name: 'OK',
        organization: 'evil',
        id: '999',
        pipelineEntryId: '999',
      } as unknown as Parameters<typeof service.update>[2]);

      const patch = txContactRepo.update.mock.calls[0][1];
      expect(patch).toEqual({ name: 'OK' });
    });
  });

  describe('setPrimary', () => {
    it('desmarca a todos del entry y luego setea el target (transacción)', async () => {
      txContactRepo.findOne.mockResolvedValue(buildContact({ isPrimary: false }));

      await service.setPrimary(ORG, '1');

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(txContactRepo.update).toHaveBeenNthCalledWith(
        1,
        { organization: ORG, pipelineEntryId: ENTRY_ID, isPrimary: true },
        { isPrimary: false },
      );
      expect(txContactRepo.update).toHaveBeenNthCalledWith(
        2,
        { id: '1', organization: ORG },
        { isPrimary: true },
      );
    });

    it('throw NotFoundException si no existe', async () => {
      txContactRepo.findOne.mockResolvedValue(null);
      await expect(service.setPrimary(ORG, '1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('borra si existe en la org', async () => {
      repo.findByIdAndOrganization.mockResolvedValue(buildContact());
      repo.deleteScoped.mockResolvedValue(undefined);

      await service.delete(ORG, '1');

      expect(repo.deleteScoped).toHaveBeenCalledWith(ORG, '1');
    });

    it('throw NotFoundException si no existe', async () => {
      repo.findByIdAndOrganization.mockResolvedValue(null);
      await expect(service.delete(ORG, '1')).rejects.toThrow(NotFoundException);
      expect(repo.deleteScoped).not.toHaveBeenCalled();
    });
  });
});
