import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Request } from 'express';
import { TodayService } from '../application/today.service';
import { TodayController } from './today.controller';

const ORG = 'acme';
const USER = '1';

describe('TodayController', () => {
  let controller: TodayController;
  let service: jest.Mocked<TodayService>;

  beforeEach(async () => {
    const serviceMock: Partial<jest.Mocked<TodayService>> = {
      getAlertsSummary: jest.fn(),
    };

    const mod = await Test.createTestingModule({
      controllers: [TodayController],
      providers: [{ provide: TodayService, useValue: serviceMock }],
    }).compile();

    controller = mod.get(TodayController);
    service = mod.get(TodayService) as jest.Mocked<TodayService>;
  });

  const reqWithUser = (user: { id: string; organization: string } | undefined) =>
    ({ user } as unknown as Request);

  describe('GET /alerts', () => {
    it('extrae organization y user.id del request y delega al service', async () => {
      const dummy = { overdueFollowUps: { count: 0, entries: [] } } as never;
      service.getAlertsSummary.mockResolvedValue(dummy);

      const req = reqWithUser({ id: USER, organization: ORG });
      const result = await controller.alerts(req);

      expect(service.getAlertsSummary).toHaveBeenCalledWith(ORG, USER);
      expect(result).toBe(dummy);
    });

    it('throw UnauthorizedException si no hay req.user', () => {
      const req = reqWithUser(undefined);
      expect(() => controller.alerts(req)).toThrow(UnauthorizedException);
      expect(service.getAlertsSummary).not.toHaveBeenCalled();
    });
  });
});
