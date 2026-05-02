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
import { TaskType } from '../../domain/task-type';

/**
 * Body de PATCH /api/tasks/:id. Todos los campos son opcionales.
 *
 * `completed: true` dispara `service.complete()` (setea `completed_at = NOW`).
 * Los demás campos pasan por `service.update()` (description / dueAt / type).
 */
export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueAt?: Date;

  @IsOptional()
  @IsEnum(TaskType)
  type?: TaskType;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}
