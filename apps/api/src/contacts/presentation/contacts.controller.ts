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
import { ContactsService } from '../application/contacts.service';
import { CreateContactDto } from '../application/dto/create-contact.dto';
import { UpdateContactDto } from '../application/dto/update-contact.dto';
import type { ReqUser } from '../../auth/application/jwt.strategy';

/**
 * Contacts: personas dentro de empresas en pipeline.
 * Visibilidad por organización (sin userId — toda la org ve los mismos contactos).
 *
 * Rutas mezcladas: anidadas para crear/listar, flat para update / setPrimary / delete.
 */
@Controller()
export class ContactsController {
  constructor(private readonly service: ContactsService) {}

  private currentUser(req: Request): ReqUser {
    const user = req.user as ReqUser | undefined;
    if (!user) throw new UnauthorizedException();
    return user;
  }

  @Post('pipeline/:entryId/contacts')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('entryId') entryId: string,
    @Body() body: CreateContactDto,
    @Req() req: Request,
  ) {
    const { organization } = this.currentUser(req);
    return this.service.create(
      organization,
      entryId,
      body.name,
      body.role,
      body.email,
      body.phone,
      body.linkedinUrl,
      body.isPrimary,
    );
  }

  @Get('pipeline/:entryId/contacts')
  list(@Param('entryId') entryId: string, @Req() req: Request) {
    const { organization } = this.currentUser(req);
    return this.service.listByPipelineEntry(organization, entryId);
  }

  @Patch('contacts/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async update(
    @Param('id') id: string,
    @Body() body: UpdateContactDto,
    @Req() req: Request,
  ): Promise<void> {
    const { organization } = this.currentUser(req);
    await this.service.update(organization, id, body);
  }

  @Patch('contacts/:id/primary')
  @HttpCode(HttpStatus.NO_CONTENT)
  async setPrimary(@Param('id') id: string, @Req() req: Request): Promise<void> {
    const { organization } = this.currentUser(req);
    await this.service.setPrimary(organization, id);
  }

  @Delete('contacts/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @Req() req: Request): Promise<void> {
    const { organization } = this.currentUser(req);
    await this.service.delete(organization, id);
  }
}
