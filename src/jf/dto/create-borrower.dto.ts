import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsBoolean,
  IsNumber,
  IsDateString,
  IsLatLong,
} from 'class-validator';

// Remember to adjust fields and types to EXACTLY match your Borrowers table columns
export class CreateBorrowerDto {
  @IsOptional()
  @IsString()
  ID?: string;

  @IsNotEmpty()
  @IsString()
  Type: string;

  @IsNotEmpty()
  @IsString()
  Name: string;

  @IsOptional()
  @IsString()
  'Location Description'?: string;

  @IsOptional()
  @IsString()
  'Society/CBO/Incorporation Certificate'?: string;

  @IsOptional()
  @IsString()
  'Year Founded'?: string;

  @IsOptional()
  @IsString()
  'SSL ID'?: string;

  @IsOptional()
  @IsLatLong()
  'Location Pin'?: string;

  @IsOptional()
  @IsString()
  'Historical School Payment Details for Loan Disbursement'?: string;

  @IsOptional()
  @IsString()
  'Payment Method'?: string;

  @IsOptional()
  @IsString()
  'Bank Name'?: string;

  @IsOptional()
  @IsString()
  'Account Name'?: string;

  @IsOptional()
  @IsString()
  'Account Number'?: string;

  @IsOptional()
  @IsString()
  'Primary Phone for Borrower'?: string;

  @IsOptional()
  @IsString()
  'Document Verifying Payment Account'?: string;

  @IsOptional()
  @IsString()
  'Manager Verification of Payment Account'?: string;

  @IsOptional()
  @IsString()
  Status?: string;

  @IsOptional()
  @IsString()
  Notes?: string;

  @IsOptional()
  @IsString()
  'Society, CBO, or Corporation'?: string;

  @IsOptional()
  @IsString()
  'Registration Number of CBO, Society, or Corporation'?: string;

  @IsOptional()
  @IsString()
  'Notes on Status'?: string;

  @IsOptional()
  @IsString()
  'Official Search'?: string;

  @IsOptional()
  @IsString()
  'Peleza Search'?: string;

  @IsOptional()
  @IsString()
  'Products Requested'?: string;

  @IsOptional()
  @IsNumber()
  'Data Collection Progress'?: number;

  @IsOptional()
  @IsString()
  'Initial Contact Details and Notes'?: string;

  @IsOptional()
  @IsString()
  'KRA PIN Photo'?: string;

  @IsOptional()
  @IsString()
  'KRA PIN Number'?: string;

  @IsOptional()
  @IsDateString()
  'Created At'?: string;

  @IsOptional()
  @IsString()
  'Created By'?: string;

  @IsOptional()
  @IsString()
  'How did the borrower hear about Jackfruit?'?: string;

  @IsOptional()
  @IsString()
  'Month And Year Created'?: string;

  @IsOptional()
  @IsString()
  'Certified by the MOE?'?: string;

  @IsOptional()
  @IsString()
  'MOE Certificate'?: string;

  @IsOptional()
  @IsString()
  County?: string;

  @IsOptional()
  @IsString()
  CR12?: string;

  @IsOptional()
  @IsString()
  'National ID Number'?: string;

  @IsOptional()
  @IsString()
  'National ID Front'?: string;

  @IsOptional()
  @IsString()
  'National ID Back'?: string;

  @IsOptional()
  @IsDateString()
  'Date of Birth'?: string;

  @IsOptional()
  @IsString()
  'Private or APBET'?: string;

  @IsOptional()
  @IsString()
  'Related Credit Applications'?: string;

  @IsOptional()
  @IsString()
  'Related Document Handovers By Borrower Giving ID'?: string;

  @IsOptional()
  @IsString()
  'Related Document Handovers By Borrower Receiving ID'?: string;

  @IsOptional()
  @IsString()
  'Related CRB Consents'?: string;

  @IsOptional()
  @IsString()
  'Related Collaterals'?: string;

  @IsOptional()
  @IsString()
  'Related Users'?: string;

  @IsOptional()
  @IsString()
  'Related Referrers'?: string;

  @IsOptional()
  @IsString()
  'Related Customer Care Calls'?: string;

  @IsOptional()
  @IsString()
  'Related Escalations'?: string;

  @IsOptional()
  @IsString()
  'Related Enrollment Reports'?: string;

  @IsOptional()
  @IsString()
  'Related Loans'?: string;

  @IsOptional()
  @IsString()
  'Related Dir. Payment Schedules'?: string;

  @IsOptional()
  @IsString()
  'Related Collaterals By Direct Loan ID'?: string;

  // Add any other relevant fields from your Borrowers table
}
