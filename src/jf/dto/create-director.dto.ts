import { IsString, IsOptional, IsIn } from 'class-validator';

export class CreateDirectorDto {
  @IsString()
  borrowerId: string;

  @IsString()
  Name: string;

  @IsString()
  'National ID Number': string;

  @IsString()
  'KRA Pin Number': string;

  @IsString()
  'Phone Number': string;

  @IsIn(['Active', 'Blacklist'])
  Status: 'Active' | 'Blacklist';

  @IsString()
  'Date Of Birth': string;

  @IsIn(['Male', 'Female', 'Other'])
  Gender: 'Male' | 'Female' | 'Other';

  @IsOptional()
  @IsString()
  Email?: string;

  @IsOptional()
  @IsString()
  'Education Level'?: string;

  @IsOptional()
  @IsIn(['Yes', 'No'])
  'Insured For Credit Life'?: 'Yes' | 'No';

  @IsOptional()
  @IsString()
  Address?: string;

  @IsOptional()
  @IsString()
  'Postal Address'?: string;

  // File upload fields
  @IsOptional()
  nationalIdFront?: any;

  @IsOptional()
  nationalIdBack?: any;

  @IsOptional()
  kraPinPhoto?: any;

  @IsOptional()
  passportPhoto?: any;
}
