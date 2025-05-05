import { IsString, IsEmail, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateTeacherDto {
  @IsNotEmpty()
  @IsString()
  Name: string;

  @IsOptional()
  @IsEmail()
  Email?: string;

  @IsOptional()
  @IsString()
  Phone?: string;

  @IsOptional()
  @IsString()
  School?: string; // Assuming School refers to the School Name or ID

  @IsOptional()
  @IsString()
  Status?: string; // e.g., 'Active', 'Inactive'

  // Add other relevant fields from your Teachers table here
  // Ensure the property names match the column names in your AppSheet table exactly.
  // Use @IsOptional() if the field is not required.

  // Example of other potential fields:
  // @IsOptional()
  // @IsString()
  // 'Teaching Level'?: string; // Use quotes if the name has spaces

  // @IsOptional()
  // @IsNumber()
  // ID?: number; // If you need to specify an ID (usually auto-generated)
}
