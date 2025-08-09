import { IsString, IsOptional } from 'class-validator';

export class CreateCreditApplicationCommentDto {
  @IsString()
  creditApplicationId: string;

  @IsString()
  @IsOptional()
  comment?: string;

  @IsString()
  @IsOptional()
  commentedBy?: string;
}
