import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssignmentRole, ContractStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateContractDto {
  @ApiProperty()
  @IsString()
  code!: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsDateString()
  startDate!: string;

  @ApiProperty()
  @IsDateString()
  endDate!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiPropertyOptional({ default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  assigneeIds?: string[];
}

export class UpdateContractDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ enum: ContractStatus })
  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;
}

export class AssignUsersDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  userIds!: string[];

  @ApiPropertyOptional({ enum: AssignmentRole })
  @IsOptional()
  @IsEnum(AssignmentRole)
  role?: AssignmentRole;
}
