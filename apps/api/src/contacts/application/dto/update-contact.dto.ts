import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Body de PATCH /api/contacts/:id.
 * Todos los campos son opcionales — el service ignora silenciosamente cualquier
 * cosa fuera de la whitelist (defensa en profundidad).
 */
export class UpdateContactDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  role?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  phone?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  linkedinUrl?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
