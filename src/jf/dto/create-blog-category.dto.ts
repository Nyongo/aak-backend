import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateBlogCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  // Slug is derived from name in the service — not required from the client
}
