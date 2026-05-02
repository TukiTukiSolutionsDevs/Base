import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { InteractionsService } from '../application/interactions.service';
import { CreateInteractionDto } from '../application/dto/create-interaction.dto';
import type { ReqUser } from '../../auth/application/jwt.strategy';

/**
 * InteractionsController.
 *
 * Rutas mezcladas:
 * - POST/GET bajo `/pipeline/:entryId/interactions` (anidado al pipeline_entry)
 * - DELETE bajo `/interactions/:id` (operación directa por id)
 *
 * Resolvemos con un único controller `@Controller()` (sin prefix) y rutas
 * explícitas en cada método. Más legible que dos controllers gemelos.
 *
 * Recordatorio: el global prefix `api/` lo agrega `app.setGlobalPrefix('api')`
 * en main.ts, así que NO se repite acá.
 */
@Controller()
export class InteractionsController {
  constructor(private readonly service: InteractionsService) {}

  private currentUser(req: Request): ReqUser {
    const user = req.user as ReqUser | undefined;
    if (!user) throw new UnauthorizedException();
    return user;
  }

  @Post('pipeline/:entryId/interactions')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('entryId') entryId: string,
    @Body() body: CreateInteractionDto,
    @Req() req: Request,
  ) {
    const { organization, id } = this.currentUser(req);
    return this.service.create(
      organization,
      id,
      entryId,
      body.type,
      body.summary,
      body.detail,
      body.occurredAt,
      body.promoteToContacted,
    );
  }

  @Get('pipeline/:entryId/interactions')
  list(@Param('entryId') entryId: string, @Req() req: Request) {
    const { organization } = this.currentUser(req);
    return this.service.listByPipelineEntry(organization, entryId);
  }

  @Delete('interactions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @Req() req: Request): Promise<void> {
    const { organization } = this.currentUser(req);
    await this.service.delete(organization, id);
  }
}
