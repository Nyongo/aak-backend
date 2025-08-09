import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateCrbConsentDto {
  @IsString()
  @IsNotEmpty()
  'Borrower ID': string;

  @IsString()
  @IsOptional()
  'Agreement'?: string;

  @IsString()
  @IsNotEmpty()
  'Signed By Name': string;

  @IsString()
  @IsOptional()
  'Date'?: string;

  @IsString()
  @IsOptional()
  'Role in Organization'?: string;
}
