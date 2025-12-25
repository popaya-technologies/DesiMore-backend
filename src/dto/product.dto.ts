import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsNumber,
  IsInt,
} from "class-validator";

export class CreateProductDto {
  @IsString()
  title: string;

  @IsArray()
  @IsString({ each: true })
  images: string[];

  @IsNumber()
  price: number;

  @IsNumber()
  @IsOptional()
  discountPrice?: number | null;

  @IsNumber()
  @IsOptional()
  wholesalePrice?: number | null;

  @IsString()
  summary: string;

  @IsString()
  @IsOptional()
  quantity?: string;

  @IsString()
  @IsOptional()
  wholesaleOrderQuantity?: string | null;

  @IsInt()
  @IsOptional()
  unitsPerCarton?: number | null;

  @IsBoolean()
  @IsOptional()
  inStock?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @IsString({ each: true })
  categoryIds: string[];

  @IsString()
  @IsOptional()
  brandId?: string;
}

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsNumber()
  @IsOptional()
  discountPrice?: number | null;

  @IsNumber()
  @IsOptional()
  wholesalePrice?: number | null;

  @IsString()
  @IsOptional()
  summary?: string;

  @IsString()
  @IsOptional()
  quantity?: string;

  @IsString()
  @IsOptional()
  wholesaleOrderQuantity?: string | null;

  @IsInt()
  @IsOptional()
  unitsPerCarton?: number | null;

  @IsBoolean()
  @IsOptional()
  inStock?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categoryIds?: string[];

  @IsString()
  @IsOptional()
  brandId?: string;
}
