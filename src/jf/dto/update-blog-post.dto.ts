import { PartialType } from '@nestjs/mapped-types';
import { CreateBlogPostDto } from './create-blog-post.dto';

// All fields optional on update
export class UpdateBlogPostDto extends PartialType(CreateBlogPostDto) {}