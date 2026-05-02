import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  Min,
} from 'class-validator';
import { PipelineStatus } from '../../domain/pipeline-status';

/** Coerción defensiva: los query strings llegan siempre como string. */
const toArray = ({ value }: { value: unknown }): string[] | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) return value.map(String);
  return [String(value)];
};

const toBool = ({ value }: { value: unknown }): boolean | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  const s = String(value).toLowerCase();
  if (['true', '1', 'yes'].includes(s)) return true;
  if (['false', '0', 'no'].includes(s)) return false;
  return undefined;
};

/** Query params de GET /api/pipeline. */
export class FilterPipelineDto {
  @IsOptional()
  @IsArray()
  @IsEnum(PipelineStatus, { each: true })
  @Transform(toArray)
  status?: PipelineStatus[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  staleDays?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(toBool)
  withOverdueTask?: boolean;
}
