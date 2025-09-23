import { IsString, IsInt, IsEmail, IsOptional, Min } from 'class-validator';

export class CreateJoinUpskillDto {
  @IsString()
  teacherName: string;

  @IsString()
  schoolName: string;

  @IsString()
  teachingLevel: string;

  @IsInt()
  @Min(0)
  numberOfLearners: number;

  @IsInt()
  @Min(0)
  yearsOfExperience: number;

  @IsEmail()
  email: string;

  @IsString()
  phoneNumber: string;

  // optional if not added in the frontend form
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  platform?: string;
}
