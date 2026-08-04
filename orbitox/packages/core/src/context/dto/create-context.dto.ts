import { IsString, IsNotEmpty, IsOptional, MaxLength, Matches, IsEnum } from 'class-validator';
import { ContextType, PlatformContextType } from '@orbitox/types';

export class CreateContextDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  type!: ContextType; // Can be platform-defined or plugin-defined

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'slug must be URL-friendly' })
  slug!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  displayName!: string;

  @IsString()
  @IsOptional()
  parentId?: string; // UUID of parent context
}
