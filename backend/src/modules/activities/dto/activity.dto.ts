import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateActivityDto {
  @ApiProperty()
  @IsUUID()
  assetId!: string;

  @ApiProperty()
  @IsUUID()
  executionArmId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  toolTemplateId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  mitreTacticId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  mitreTechniqueId?: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty({ example: 'nmap' })
  @IsString()
  tool!: string;

  @ApiPropertyOptional({ description: 'Rendered command sent to the execution arm' })
  @IsOptional()
  @IsString()
  command?: string;

  @ApiPropertyOptional({ description: 'Custom Python forwarded to the execution arm — never executed by the API' })
  @IsOptional()
  @IsString()
  pythonCode?: string;
}
