import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TaskType } from '../../domain/task-type';

/** Body de POST /api/tasks. */
export class CreateTaskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  description!: string;

  @Type(() => Date)
  @IsDate()
  dueAt!: Date;

  @IsEnum(TaskType, {
    message: `type debe ser uno de: ${Object.values(TaskType).join(', ')}`,
  })
  type!: TaskType;

  /** Opcional: tarea libre del usuario sin empresa asociada. */
  @IsOptional()
  @IsString()
  pipelineEntryId?: string;
}
