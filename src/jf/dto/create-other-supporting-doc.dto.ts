import { IsString, IsOptional } from 'class-validator';

export class CreateOtherSupportingDocDto {
  @IsString()
  creditApplicationId: string;

  @IsString()
  @IsOptional()
  documentType?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
