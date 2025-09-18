import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateJFNetworkContactPageDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(
    [
      'GENERAL_INQUIRY',
      'SUPPORT_REQUEST',
      'PARTNERSHIP_INQUIRY',
      'FEEDBACK',
      'OTHER',
    ],
    {
      message: 'messageType must be one of the allowed values',
    },
  )
  messageType: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['WEBSITE', 'MOBILE_APP', 'API', 'EMAIL', 'PHONE'], {
    message: 'platform must be one of the allowed values',
  })
  platform: string;
}

export class UpdateJFNetworkContactPageDto {
  @IsString()
  @IsOptional()
  @IsIn([
    'GENERAL_INQUIRY',
    'SUPPORT_REQUEST',
    'PARTNERSHIP_INQUIRY',
    'FEEDBACK',
    'OTHER',
  ])
  messageType?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  message?: string;

  @IsString()
  @IsOptional()
  @IsIn(['WEBSITE', 'MOBILE_APP', 'API', 'EMAIL', 'PHONE'])
  platform?: string;

  @IsString()
  @IsOptional()
  @IsIn(['NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'])
  status?: string;

  @IsString()
  @IsOptional()
  viewedBy?: string;

  @IsOptional()
  viewedAt?: Date;
}
