import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssetType, Criticality } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsObject, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';

export class CreateAssetDto {
  @ApiProperty()
  @IsUUID()
  contractId!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ enum: AssetType })
  @IsEnum(AssetType)
  type!: AssetType;

  @ApiProperty({ description: 'IP, hostname, URL, CIDR, etc.' })
  @IsString()
  value!: string;

  @ApiPropertyOptional({ enum: Criticality })
  @IsOptional()
  @IsEnum(Criticality)
  criticality?: Criticality;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateAssetDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: AssetType })
  @IsOptional()
  @IsEnum(AssetType)
  type?: AssetType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  value?: string;

  @ApiPropertyOptional({ enum: Criticality })
  @IsOptional()
  @IsEnum(Criticality)
  criticality?: Criticality;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class BulkAssetItemDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ enum: AssetType })
  @IsEnum(AssetType)
  type!: AssetType;

  @ApiProperty()
  @IsString()
  value!: string;

  @ApiPropertyOptional({ enum: Criticality })
  @IsOptional()
  @IsEnum(Criticality)
  criticality?: Criticality;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  tags?: string[];
}

export class BulkImportAssetsDto {
  @ApiProperty()
  @IsUUID()
  contractId!: string;

  @ApiProperty({ type: [BulkAssetItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkAssetItemDto)
  items!: BulkAssetItemDto[];
}
