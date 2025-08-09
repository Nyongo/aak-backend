import { IsString, IsOptional, IsIn } from 'class-validator';

export class CreateVendorDisbursementDetailDto {
  @IsString()
  creditApplicationId: string;

  @IsString()
  vendorPaymentMethod: string;

  @IsOptional()
  @IsString()
  phoneNumberForMPesaPayment?: string;

  @IsIn(['Y', 'N'])
  managerVerification: 'Y' | 'N';

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  accountName?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  phoneNumberForBankAccount?: string;

  @IsOptional()
  @IsString()
  paybillNumberAndAccount?: string;

  @IsOptional()
  @IsString()
  buyGoodsTill?: string;
}
