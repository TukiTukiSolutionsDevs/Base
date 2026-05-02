import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { InteractionType } from '../../domain/interaction-type';

/** Body de POST /api/pipeline/:entryId/interactions. */
export class CreateInteractionDto {
  @IsEnum(InteractionType, {
    message: `type debe ser uno de: ${Object.values(InteractionType).join(', ')}`,
  })
  type!: InteractionType;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  summary!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  detail?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  occurredAt?: Date;

  @IsOptional()
  @IsBoolean()
  promoteToContacted?: boolean;
}
