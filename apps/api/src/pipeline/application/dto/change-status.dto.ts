import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PipelineStatus } from '../../domain/pipeline-status';

/**
 * Body de PATCH /api/pipeline/:id/status.
 * La regla "lostReason obligatorio cuando status=LOST" la valida el service
 * (depende del estado, no es un check estructural del DTO).
 */
export class ChangeStatusDto {
  @IsEnum(PipelineStatus, {
    message: `status debe ser uno de: ${Object.values(PipelineStatus).join(', ')}`,
  })
  status!: PipelineStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  lostReason?: string;
}
