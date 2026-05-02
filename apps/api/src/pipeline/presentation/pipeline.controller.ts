import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PipelineService } from '../application/pipeline.service';
import { ChangeStatusDto } from '../application/dto/change-status.dto';
import { CreatePipelineEntryDto } from '../application/dto/create-pipeline-entry.dto';
import { FilterPipelineDto } from '../application/dto/filter-pipeline.dto';
import { UpdateValueHypothesisDto } from '../application/dto/update-value-hypothesis.dto';
import type { ReqUser } from '../../auth/application/jwt.strategy';

/**
 * Pipeline (CRM-lite): empresas que la organización está prospectando.
 * Todas las rutas bajo `/api/pipeline` requieren JWT (guard global).
 * Scoping por organization viene de `req.user`.
 */
@Controller('pipeline')
export class PipelineController {
  constructor(private readonly service: PipelineService) {}

  private currentUser(req: Request): ReqUser {
    const user = req.user as ReqUser | undefined;
    if (!user) throw new UnauthorizedException();
    return user;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: CreatePipelineEntryDto, @Req() req: Request) {
    const { organization, id } = this.currentUser(req);
    return this.service.create(organization, id, body.companyRuc, body.valueHypothesis);
  }

  @Get()
  list(@Query() filter: FilterPipelineDto, @Req() req: Request) {
    const { organization } = this.currentUser(req);
    return this.service.listByOrg(organization, {
      status: filter.status,
      staleDays: filter.staleDays,
      withOverdueTask: filter.withOverdueTask,
    });
  }

  @Get(':id')
  getById(@Param('id') id: string, @Req() req: Request) {
    const { organization } = this.currentUser(req);
    return this.service.getByIdScoped(organization, id);
  }

  @Patch(':id/status')
  changeStatus(
    @Param('id') id: string,
    @Body() body: ChangeStatusDto,
    @Req() req: Request,
  ) {
    const { organization } = this.currentUser(req);
    return this.service.changeStatus(organization, id, body.status, body.lostReason);
  }

  @Patch(':id/value-hypothesis')
  updateValueHypothesis(
    @Param('id') id: string,
    @Body() body: UpdateValueHypothesisDto,
    @Req() req: Request,
  ) {
    const { organization } = this.currentUser(req);
    return this.service.updateValueHypothesis(organization, id, body.text);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @Req() req: Request): Promise<void> {
    const { organization } = this.currentUser(req);
    await this.service.delete(organization, id);
  }
}
