import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class CreateDirectLendingProcessingDto {
  @IsOptional()
  @IsString()
  sheetId?: string;

  @IsOptional()
  @IsString()
  paymentType?: string;

  @IsOptional()
  @IsString()
  paymentSource?: string;

  @IsOptional()
  @IsString()
  borrowerType?: string;

  @IsOptional()
  @IsString()
  borrowerId?: string;

  @IsOptional()
  @IsString()
  directLoanId?: string;

  @IsOptional()
  @IsString()
  paymentScheduleId?: string;

  @IsOptional()
  @IsString()
  paymentDate?: string;

  @IsOptional()
  @IsString()
  amountPaid?: string;

  @IsOptional()
  @IsString()
  paymentReferenceOrTransactionCode?: string;

  @IsOptional()
  @IsString()
  installmentPaymentAmount?: string;

  @IsOptional()
  @IsString()
  installmentVehicleInsurancePremiumAmount?: string;

  @IsOptional()
  @IsString()
  installmentVehicleInsuranceSurchargeAmount?: string;

  @IsOptional()
  @IsString()
  installmentInterestAmount?: string;

  @IsOptional()
  @IsString()
  installmentPrincipalAmount?: string;

  @IsOptional()
  @IsString()
  vehicleInsurancePremiumPaid?: string;

  @IsOptional()
  @IsString()
  vehicleInsuranceSurchargePaid?: string;

  @IsOptional()
  @IsString()
  interestPaid?: string;

  @IsOptional()
  @IsString()
  principalPaid?: string;

  @IsOptional()
  @IsString()
  createdBy?: string;

  @IsOptional()
  @IsString()
  sslId?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsBoolean()
  synced?: boolean;
}
