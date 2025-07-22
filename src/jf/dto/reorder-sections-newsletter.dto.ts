import { IsString, IsArray, ArrayNotEmpty, ValidateNested, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

class OrderItem {
  @IsString() id!: string;
  @IsInt() order!: number;
}

export class ReorderSectionsDto {
  @IsString() newsletterId!: string;

  @IsArray() @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => OrderItem)
  sections!: OrderItem[];
}
