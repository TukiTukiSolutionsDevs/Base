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
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { NotesService } from '../application/notes.service';
import { CreateNoteDto } from '../application/dto/create-note.dto';
import { UpdateNoteDto } from '../application/dto/update-note.dto';
import type { ReqUser } from '../../auth/application/jwt.strategy';

/**
 * Notes: texto libre vinculado a un pipeline_entry.
 *
 * Rutas mezcladas: anidadas para crear/listar (scope por entry), flat para update/delete
 * (la note ya tiene id propio).
 */
@Controller()
export class NotesController {
  constructor(private readonly service: NotesService) {}

  private currentUser(req: Request): ReqUser {
    const user = req.user as ReqUser | undefined;
    if (!user) throw new UnauthorizedException();
    return user;
  }

  @Post('pipeline/:entryId/notes')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('entryId') entryId: string,
    @Body() body: CreateNoteDto,
    @Req() req: Request,
  ) {
    const { organization, id } = this.currentUser(req);
    return this.service.create(organization, id, entryId, body.body);
  }

  @Get('pipeline/:entryId/notes')
  list(@Param('entryId') entryId: string, @Req() req: Request) {
    const { organization } = this.currentUser(req);
    return this.service.listByPipelineEntry(organization, entryId);
  }

  @Patch('notes/:id')
  update(
    @Param('id') id: string,
    @Body() body: UpdateNoteDto,
    @Req() req: Request,
  ) {
    const { organization } = this.currentUser(req);
    return this.service.update(organization, id, body.body);
  }

  @Delete('notes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @Req() req: Request): Promise<void> {
    const { organization } = this.currentUser(req);
    await this.service.delete(organization, id);
  }
}
