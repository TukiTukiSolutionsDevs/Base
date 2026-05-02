import { IsString, MaxLength, MinLength } from 'class-validator';

/** Body de PATCH /api/notes/:id. */
export class UpdateNoteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  body!: string;
}
