import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FindingSeverity, FindingStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateFindingDto {
  @ApiProperty()
  @IsUUID()
  contractId!: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiProperty({ enum: FindingSeverity })
  @IsEnum(FindingSeverity)
  severity!: FindingSeverity;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assetId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  activityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  mitreTechniqueId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10)
  cvss?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cwe?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recommendation?: string;
}

export class UpdateFindingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: FindingSeverity })
  @IsOptional()
  @IsEnum(FindingSeverity)
  severity?: FindingSeverity;

  @ApiPropertyOptional({ enum: FindingStatus })
  @IsOptional()
  @IsEnum(FindingStatus)
  status?: FindingStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recommendation?: string;
}
