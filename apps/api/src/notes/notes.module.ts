import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NoteEntity } from './domain/note.entity';
import { NotesRepository } from './infrastructure/notes.repository';
import { NotesService } from './application/notes.service';
import { NotesController } from './presentation/notes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([NoteEntity])],
  controllers: [NotesController],
  providers: [NotesRepository, NotesService],
  exports: [NotesRepository, NotesService],
})
export class NotesModule {}
