import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AgentConnectionType } from '@prisma/client';
import { IsEnum, IsInt, IsObject, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAgentDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: AgentConnectionType })
  @IsEnum(AgentConnectionType)
  connectionType!: AgentConnectionType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  host?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  port?: number;

  @ApiPropertyOptional({ description: 'Plain credentials — encrypted at rest' })
  @IsOptional()
  @IsObject()
  credentials?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  connectionConfig?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}

export class UpdateAgentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  host?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  port?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  credentials?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  connectionConfig?: Record<string, unknown>;
}
