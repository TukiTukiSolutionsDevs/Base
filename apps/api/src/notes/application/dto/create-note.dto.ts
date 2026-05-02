import { IsString, MaxLength, MinLength } from 'class-validator';

/** Body de POST /api/pipeline/:entryId/notes. */
export class CreateNoteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  body!: string;
}
