import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

/**
 * Body de POST /api/pipeline.
 * `companyRuc` es FK lógica a `companies.ruc` (varchar 11). Validamos formato
 * acá para fallar rápido antes de llegar al service.
 */
export class CreatePipelineEntryDto {
  @IsString()
  @Matches(/^\d{11}$/, { message: 'companyRuc debe tener exactamente 11 dígitos' })
  companyRuc!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  valueHypothesis?: string;
}
