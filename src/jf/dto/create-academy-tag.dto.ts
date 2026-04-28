import { IsString, IsNotEmpty } from 'class-validator';

export class CreateAcademyTagDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
