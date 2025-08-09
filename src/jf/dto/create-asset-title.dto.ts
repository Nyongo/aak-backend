import { IsString, IsOptional, IsNumber, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateAssetTitleDto {
  @IsString()
  'Credit Application ID': string;

  @IsString()
  @IsOptional()
  Type?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    // Convert "Yes"/"No" to "Y"/"N"
    if (value === 'Yes' || value === 'yes') return 'Y';
    if (value === 'No' || value === 'no') return 'N';
    return value;
  })
  @IsIn(['Y', 'N'])
  'To Be Used As Security?'?: 'Y' | 'N';

  @IsString()
  @IsOptional()
  Description?: string;

  @IsString()
  @IsOptional()
  'Legal Owner'?: string;

  @IsString()
  @IsOptional()
  'User ID'?: string;

  @IsString()
  @IsOptional()
  'Full Owner Details'?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    // Convert "Yes"/"No" to "Y"/"N"
    if (value === 'Yes' || value === 'yes') return 'Y';
    if (value === 'No' || value === 'no') return 'N';
    return value;
  })
  @IsIn(['Y', 'N'])
  'Collateral owned by director of school?'?: 'Y' | 'N';

  @IsString()
  @IsOptional()
  'Plot Number'?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    // Convert "Yes"/"No" to "Y"/"N"
    if (value === 'Yes' || value === 'yes') return 'Y';
    if (value === 'No' || value === 'no') return 'N';
    return value;
  })
  @IsIn(['Y', 'N'])
  'School sits on land?'?: 'Y' | 'N';

  @IsString()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    // Convert "Yes"/"No" to "Y"/"N"
    if (value === 'Yes' || value === 'yes') return 'Y';
    if (value === 'No' || value === 'no') return 'N';
    return value;
  })
  @IsIn(['Y', 'N'])
  'Has Comprehensive Insurance'?: 'Y' | 'N';

  @IsOptional()
  @Transform(({ value }) => value?.toString())
  'Original Insurance Coverage'?: number;

  @IsOptional()
  @Transform(({ value }) => value?.toString())
  'Initial Estimated Value (KES)': number;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    // Convert "Yes"/"No" to "Y"/"N"
    if (value === 'Yes' || value === 'yes') return 'Y';
    if (value === 'No' || value === 'no') return 'N';
    return value;
  })
  @IsIn(['Y', 'N'])
  'Approved by Legal Team or NTSA Agent for use as Security?'?: 'Y' | 'N';

  @IsString()
  @IsOptional()
  'Notes on Approval for Use'?: string;

  @IsOptional()
  @Transform(({ value }) => value?.toString())
  "Evaluator's Market Value"?: number;

  @IsOptional()
  @Transform(({ value }) => value?.toString())
  "Evaluator's Forced Value"?: number;

  @IsOptional()
  @Transform(({ value }) => value?.toString())
  'Money Owed on Asset (If Any)'?: number;

  @IsString()
  @IsOptional()
  'License Plate Number'?: string;

  @IsOptional()
  @Transform(({ value }) => value?.toString())
  'Engine CC'?: number;

  @IsOptional()
  @Transform(({ value }) => value?.toString())
  'Year of Manufacture'?: number;
}
