import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactEntity } from './domain/contact.entity';
import { ContactsRepository } from './infrastructure/contacts.repository';
import { ContactsService } from './application/contacts.service';
import { ContactsController } from './presentation/contacts.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ContactEntity])],
  controllers: [ContactsController],
  providers: [ContactsRepository, ContactsService],
  exports: [ContactsRepository, ContactsService],
})
export class ContactsModule {}
