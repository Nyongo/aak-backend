import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { MessageType, Platform, MessageStatus } from '@prisma/client';

export class CreateJFNetworkContactPageDto {
  @IsEnum(MessageType)
  messageType: MessageType;

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

  @IsEnum(Platform)
  platform: Platform;
}

export class UpdateJFNetworkContactPageDto {
  @IsEnum(MessageType)
  @IsOptional()
  messageType?: MessageType;

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

  @IsEnum(Platform)
  @IsOptional()
  platform?: Platform;

  @IsEnum(MessageStatus)
  @IsOptional()
  status?: MessageStatus;

  @IsString()
  @IsOptional()
  viewedBy?: string;

  @IsOptional()
  viewedAt?: Date;
}