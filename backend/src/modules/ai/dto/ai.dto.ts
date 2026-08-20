import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AiProvider } from '@prisma/client';
import { IsBoolean, IsEnum, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAiEndpointDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ enum: AiProvider })
  @IsEnum(AiProvider)
  provider!: AiProvider;

  @ApiProperty({ example: 'https://api.openai.com/v1' })
  @IsString()
  baseUrl!: string;

  @ApiProperty({ example: 'gpt-4o' })
  @IsString()
  model!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  extraHeaders?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}

export class UpdateAiEndpointDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  baseUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
