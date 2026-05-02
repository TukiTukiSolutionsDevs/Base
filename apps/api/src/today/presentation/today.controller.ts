import { Controller, Get, Req, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { ReqUser } from '../../auth/application/jwt.strategy';
import { TodayService } from '../application/today.service';

/**
 * Endpoints que alimentan la pantalla "Hoy" del frontend.
 * Todas las rutas bajo `/api/today` requieren JWT (guard global).
 */
@Controller('today')
export class TodayController {
  constructor(private readonly service: TodayService) {}

  private currentUser(req: Request): ReqUser {
    const user = req.user as ReqUser | undefined;
    if (!user) throw new UnauthorizedException();
    return user;
  }

  /** Smart prompts + snapshot del pipeline + últimas interacciones, todo en una llamada. */
  @Get('alerts')
  alerts(@Req() req: Request) {
    const { organization, id } = this.currentUser(req);
    return this.service.getAlertsSummary(organization, id);
  }
}
