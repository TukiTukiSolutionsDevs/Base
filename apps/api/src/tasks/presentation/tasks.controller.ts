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
import { TasksService, type TaskUpdatePatch } from '../application/tasks.service';
import { CreateTaskDto } from '../application/dto/create-task.dto';
import { UpdateTaskDto } from '../application/dto/update-task.dto';
import type { ReqUser } from '../../auth/application/jwt.strategy';

/**
 * TasksController.
 * Mezcla rutas planas (`/tasks/...`) con anidadas (`/pipeline/:entryId/tasks`).
 *
 * Convención: si `completed: true` viene en el PATCH, se llama `service.complete()`
 * (setea `completed_at = NOW`). El resto de los campos del patch se aplican
 * antes via `service.update()` para que un mismo PATCH pueda editar y completar.
 */
@Controller()
export class TasksController {
  constructor(private readonly service: TasksService) {}

  private currentUser(req: Request): ReqUser {
    const user = req.user as ReqUser | undefined;
    if (!user) throw new UnauthorizedException();
    return user;
  }

  @Post('tasks')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: CreateTaskDto, @Req() req: Request) {
    const { organization, id } = this.currentUser(req);
    return this.service.create(
      organization,
      id,
      body.description,
      body.dueAt,
      body.type,
      body.pipelineEntryId,
    );
  }

  @Get('tasks/today')
  listToday(@Req() req: Request) {
    const { organization, id } = this.currentUser(req);
    return this.service.listForToday(organization, id);
  }

  @Get('pipeline/:entryId/tasks')
  listByPipelineEntry(@Param('entryId') entryId: string, @Req() req: Request) {
    const { organization } = this.currentUser(req);
    return this.service.listByPipelineEntry(organization, entryId);
  }

  @Patch('tasks/:id')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateTaskDto,
    @Req() req: Request,
  ) {
    const { organization } = this.currentUser(req);

    const patch: TaskUpdatePatch = {};
    if (body.description !== undefined) patch.description = body.description;
    if (body.dueAt !== undefined) patch.dueAt = body.dueAt;
    if (body.type !== undefined) patch.type = body.type;

    let result = Object.keys(patch).length > 0
      ? await this.service.update(organization, id, patch)
      : null;

    if (body.completed === true) {
      result = await this.service.complete(organization, id);
    }

    // Si no vino nada, devolvemos el estado actual (no-op) — equivale a un fetch.
    return result ?? this.service.update(organization, id, {});
  }

  @Delete('tasks/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @Req() req: Request): Promise<void> {
    const { organization } = this.currentUser(req);
    await this.service.delete(organization, id);
  }
}
