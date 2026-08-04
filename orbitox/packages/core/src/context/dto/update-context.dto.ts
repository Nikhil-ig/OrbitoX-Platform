import { IsString, IsOptional, MaxLength, Matches, IsEnum } from 'class-validator';
import { ContextStatus } from '@orbitox/types';

export class UpdateContextDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  displayName?: string;

  @IsEnum(['active', 'suspended', 'archived'] as ContextStatus[])
  @IsOptional()
  status?: ContextStatus;

  // Other fields like settings/theme would use nested DTOs (omitted for brevity in this initial implementation)
}
