import { IsString, IsOptional } from 'class-validator';

export class CreateHomeVisitDto {
  @IsString()
  'Credit Application ID': string;

  @IsString()
  'User ID': string;

  @IsString()
  @IsOptional()
  County?: string;

  @IsString()
  @IsOptional()
  'Address Details '?: string;

  @IsString()
  @IsOptional()
  'Location Pin'?: string;

  @IsString()
  @IsOptional()
  'Own or Rent'?: string;

  @IsString()
  @IsOptional()
  'How many years have they stayed there?'?: string;

  @IsString()
  @IsOptional()
  'Marital Status'?: string;

  @IsString()
  @IsOptional()
  'How many children does the director have?'?: string;

  @IsString()
  @IsOptional()
  'Is the spouse involved in running school?'?: string;

  @IsString()
  @IsOptional()
  'Does the spouse have other income?'?: string;

  @IsString()
  @IsOptional()
  'If yes, how much per month? '?: string;

  @IsString()
  @IsOptional()
  'Is the director behind on any utility bills at home? '?: string;

  @IsString()
  @IsOptional()
  'What is the total number of rooms in house? (Include all types of rooms) '?: string;

  @IsString()
  @IsOptional()
  'How is the neighborhood? Provide general comments.'?: string;

  @IsString()
  @IsOptional()
  'How accessible is the house in case of default? Were there a lot of gates in neighborhood/home? '?: string;

  @IsString()
  @IsOptional()
  "Is the director's home in the same city as their school? "?: string;

  @IsString()
  @IsOptional()
  'Is the director a trained educator?'?: string;

  @IsString()
  @IsOptional()
  'Does the director have another profitable business?'?: string;

  @IsString()
  @IsOptional()
  'Other Notes'?: string;
}
