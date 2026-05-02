import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ContactsService } from '../application/contacts.service';
import { CreateContactDto } from '../application/dto/create-contact.dto';
import { ContactsController } from './contacts.controller';

describe('ContactsController', () => {
  const reqUser = { id: 'user-1', username: 'tuki', organization: 'org-1' };
  const fakeReq = { user: reqUser } as any;

  let controller: ContactsController;
  const serviceMock = {
    create: jest.fn(),
    listByPipelineEntry: jest.fn(),
    update: jest.fn(),
    setPrimary: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [ContactsController],
      providers: [{ provide: ContactsService, useValue: serviceMock }],
    }).compile();
    controller = moduleRef.get(ContactsController);
  });

  describe('happy paths', () => {
    it('create() delega con todos los campos en orden', async () => {
      serviceMock.create.mockResolvedValue({ id: '1' });
      const body: CreateContactDto = {
        name: 'Lucía Pérez',
        role: 'CFO',
        email: 'lucia@empresa.com',
        phone: '+51 999 999 999',
        linkedinUrl: 'https://linkedin.com/in/lucia',
        isPrimary: true,
      };

      await controller.create('42', body, fakeReq);

      expect(serviceMock.create).toHaveBeenCalledWith(
        'org-1',
        '42',
        'Lucía Pérez',
        'CFO',
        'lucia@empresa.com',
        '+51 999 999 999',
        'https://linkedin.com/in/lucia',
        true,
      );
    });

    it('setPrimary() llama service.setPrimary', async () => {
      serviceMock.setPrimary.mockResolvedValue(undefined);
      await controller.setPrimary('7', fakeReq);
      expect(serviceMock.setPrimary).toHaveBeenCalledWith('org-1', '7');
    });

    it('delete() llama service.delete', async () => {
      serviceMock.delete.mockResolvedValue(undefined);
      await controller.delete('7', fakeReq);
      expect(serviceMock.delete).toHaveBeenCalledWith('org-1', '7');
    });
  });

  describe('validation', () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    });

    it('rechaza CreateContactDto sin name', async () => {
      await expect(
        pipe.transform({ role: 'CFO' }, { type: 'body', metatype: CreateContactDto }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza CreateContactDto con email mal formado', async () => {
      await expect(
        pipe.transform(
          { name: 'Lucía', email: 'no-es-email' },
          { type: 'body', metatype: CreateContactDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
