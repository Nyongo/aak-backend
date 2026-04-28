import { IsEmail, IsNotEmpty } from 'class-validator';

export class AcademySubscribeDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
