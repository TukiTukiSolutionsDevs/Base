import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  username!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  password!: string;
}

export interface AuthUserDto {
  id: string;
  username: string;
  displayName: string;
  organization: string;
  lastLoginAt: string | null;
}
