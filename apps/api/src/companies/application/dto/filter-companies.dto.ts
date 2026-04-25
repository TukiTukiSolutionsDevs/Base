import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

const toArray = ({ value }: { value: unknown }): string[] | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) return value.map(String);
  return [String(value)];
};

const toBool = ({ value }: { value: unknown }): boolean | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  const s = String(value).toLowerCase();
  if (['true', '1', 'yes', 'si', 'sí'].includes(s)) return true;
  if (['false', '0', 'no'].includes(s)) return false;
  return undefined;
};

export const SORTABLE_FIELDS = [
  'razonSocial',
  'trabajadores',
  'locales',
  'fechaFundacion',
] as const;
export type SortableField = (typeof SORTABLE_FIELDS)[number];

export class FilterCompaniesDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  @Transform(toArray)
  sector?: string[];

  @IsOptional() @IsArray() @IsString({ each: true })
  @Transform(toArray)
  macrosector?: string[];

  @IsOptional() @IsArray() @IsString({ each: true })
  @Transform(toArray)
  departamento?: string[];

  @IsOptional() @IsArray() @IsString({ each: true })
  @Transform(toArray)
  provincia?: string[];

  @IsOptional() @IsArray() @IsString({ each: true })
  @Transform(toArray)
  distrito?: string[];

  @IsOptional() @IsArray() @IsString({ each: true })
  @Transform(toArray)
  tamano?: string[];

  @IsOptional() @IsArray() @IsString({ each: true })
  @Transform(toArray)
  riesgo?: string[];

  @IsOptional() @IsArray() @IsString({ each: true })
  @Transform(toArray)
  estado?: string[];

  @IsOptional() @IsArray() @IsString({ each: true })
  @Transform(toArray)
  origen?: string[];

  @IsOptional() @IsBoolean()
  @Transform(toBool)
  estatal?: boolean;

  @IsOptional() @IsBoolean()
  @Transform(toBool)
  tieneEmail?: boolean;

  @IsOptional() @IsBoolean()
  @Transform(toBool)
  tieneTelefono?: boolean;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  trabajadoresMin?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  trabajadoresMax?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200)
  pageSize?: number = 50;

  @IsOptional() @IsIn([...SORTABLE_FIELDS])
  sortBy?: SortableField;

  @IsOptional() @IsIn(['asc', 'desc'])
  sortDir?: 'asc' | 'desc' = 'asc';
}
