import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PipelineService } from '../application/pipeline.service';
import { PipelineStatus } from '../domain/pipeline-status';
import { CreatePipelineEntryDto } from '../application/dto/create-pipeline-entry.dto';
import { ChangeStatusDto } from '../application/dto/change-status.dto';
import { PipelineController } from './pipeline.controller';

describe('PipelineController', () => {
  const reqUser = { id: 'user-1', username: 'tuki', organization: 'org-1' };
  const fakeReq = { user: reqUser } as any;

  let controller: PipelineController;
  const serviceMock = {
    create: jest.fn(),
    listByOrg: jest.fn(),
    getByIdScoped: jest.fn(),
    changeStatus: jest.fn(),
    updateValueHypothesis: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [PipelineController],
      providers: [{ provide: PipelineService, useValue: serviceMock }],
    }).compile();
    controller = moduleRef.get(PipelineController);
  });

  describe('happy paths', () => {
    it('create() delega al service con orgId, userId, ruc, hypothesis', async () => {
      serviceMock.create.mockResolvedValue({ id: '10' });
      const body: CreatePipelineEntryDto = {
        companyRuc: '20100000001',
        valueHypothesis: 'tesis',
      };

      const result = await controller.create(body, fakeReq);

      expect(serviceMock.create).toHaveBeenCalledWith('org-1', 'user-1', '20100000001', 'tesis');
      expect(result).toEqual({ id: '10' });
    });

    it('list() pasa los filtros parseados', async () => {
      serviceMock.listByOrg.mockResolvedValue([]);
      const filter = {
        status: [PipelineStatus.IN_SIGHT],
        staleDays: 7,
        withOverdueTask: true,
      };

      await controller.list(filter as any, fakeReq);

      expect(serviceMock.listByOrg).toHaveBeenCalledWith('org-1', filter);
    });

    it('changeStatus() delega y propaga lostReason', async () => {
      serviceMock.changeStatus.mockResolvedValue({ id: '7' });
      const body: ChangeStatusDto = { status: PipelineStatus.LOST, lostReason: 'no fit' };

      await controller.changeStatus('7', body, fakeReq);

      expect(serviceMock.changeStatus).toHaveBeenCalledWith(
        'org-1',
        '7',
        PipelineStatus.LOST,
        'no fit',
      );
    });

    it('delete() devuelve 204 (no body) y llama service.delete', async () => {
      serviceMock.delete.mockResolvedValue(undefined);

      const result = await controller.delete('99', fakeReq);

      expect(result).toBeUndefined();
      expect(serviceMock.delete).toHaveBeenCalledWith('org-1', '99');
    });
  });

  describe('validation', () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    });

    it('rechaza CreatePipelineEntryDto sin companyRuc', async () => {
      await expect(
        pipe.transform(
          { valueHypothesis: 'x' },
          { type: 'body', metatype: CreatePipelineEntryDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza CreatePipelineEntryDto con companyRuc inválido (no 11 dígitos)', async () => {
      await expect(
        pipe.transform(
          { companyRuc: 'abc' },
          { type: 'body', metatype: CreatePipelineEntryDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza ChangeStatusDto con status fuera del enum', async () => {
      await expect(
        pipe.transform(
          { status: 'WHATEVER' },
          { type: 'body', metatype: ChangeStatusDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
