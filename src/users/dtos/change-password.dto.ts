import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  id?: number;
  @IsString()
  @MinLength(5, {
    message: 'Current password must be at least 5 characters long',
  })
  currentPassword: string;

  @IsString()
  @MinLength(6, { message: 'New password must be at least 6 characters long' })
  newPassword: string;

  @IsString()
  @MinLength(6, {
    message: 'Repeat new password must be at least 6 characters long',
  })
  repeatNewPassword: string;
}
