import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContactType, OrganizationStatus } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ContactDto {
  @ApiProperty({ enum: ContactType })
  @IsEnum(ContactType)
  type!: ContactType;

  @ApiProperty()
  @IsString()
  label!: string;

  @ApiProperty()
  @IsString()
  value!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  personName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  personRole?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class CreateOrganizationDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({ type: [ContactDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactDto)
  contacts?: ContactDto[];
}

export class UpdateOrganizationDto {
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
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({ enum: OrganizationStatus })
  @IsOptional()
  @IsEnum(OrganizationStatus)
  status?: OrganizationStatus;
}
