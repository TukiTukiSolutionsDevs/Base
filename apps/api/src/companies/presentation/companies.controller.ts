import { Controller, Get, Header, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { CompaniesService } from '../application/companies.service';
import { FilterCompaniesDto } from '../application/dto/filter-companies.dto';
import type { ReqUser } from '../../auth/application/jwt.strategy';

/**
 * Todas las rutas requieren JWT (guard global JwtAuthGuard).
 * El usuario autenticado llega en req.user (tipo ReqUser) si lo necesitamos.
 */
@Controller('companies')
export class CompaniesController {
  constructor(private readonly service: CompaniesService) {}

  @Get()
  list(@Query() filter: FilterCompaniesDto, @Req() _req: Request) {
    return this.service.findPaged(filter);
  }

  @Get('facets')
  facets() {
    return this.service.facets();
  }

  @Get('stats')
  stats() {
    return this.service.stats();
  }

  @Get('export.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="empresas.csv"')
  async export(
    @Query() filter: FilterCompaniesDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const user = req.user as ReqUser | undefined;
    // Trazabilidad: log de quién bajó qué (útil cuando sólo hay 2 cuentas)
    // eslint-disable-next-line no-console
    console.log(`[csv] export by user=${user?.username ?? '?'} org=${user?.organization ?? '?'}`);
    const csv = await this.service.exportCsv(filter);
    res.send(csv);
  }
}
