import { IsString, MaxLength } from 'class-validator';

/** Body de PATCH /api/pipeline/:id/value-hypothesis. */
export class UpdateValueHypothesisDto {
  @IsString()
  @MaxLength(2000)
  text!: string;
}
