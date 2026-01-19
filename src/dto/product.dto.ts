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
  images: string[];

  @IsString()
  @IsOptional()
  model?: string;

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

  @IsNumber()
  @IsOptional()
  weight?: number | null;

  @IsNumber()
  @IsOptional()
  length?: number | null;

  @IsNumber()
  @IsOptional()
  width?: number | null;

  @IsNumber()
  @IsOptional()
  height?: number | null;

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

  @IsString()
  @IsOptional()
  tag?: string;

  @IsString()
  @IsOptional()
  metaTitle?: string;

  @IsString()
  @IsOptional()
  metaDescription?: string;

  @IsString()
  @IsOptional()
  metaKeyword?: string;
}

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsArray()
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

  @IsNumber()
  @IsOptional()
  weight?: number | null;

  @IsNumber()
  @IsOptional()
  length?: number | null;

  @IsNumber()
  @IsOptional()
  width?: number | null;

  @IsNumber()
  @IsOptional()
  height?: number | null;

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

  @IsString()
  @IsOptional()
  tag?: string;

  @IsString()
  @IsOptional()
  metaTitle?: string;

  @IsString()
  @IsOptional()
  metaDescription?: string;

  @IsString()
  @IsOptional()
  metaKeyword?: string;
}
