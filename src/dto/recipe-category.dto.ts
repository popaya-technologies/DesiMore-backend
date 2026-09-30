import { Type } from "class-transformer";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class CreateRecipeCategoryDto {
  @IsString()
  @Matches(/\S/)
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100000)
  description?: string;

  @IsString()
  @Matches(/\S/)
  @MaxLength(255)
  metaTitle!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  metaDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  metaKeywords?: string;

  @IsOptional()
  @IsUUID()
  parent?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  image?: string | null;

  @IsOptional()
  @IsBoolean()
  top?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  columns?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  seoKeyword?: string | null;
}

export class UpdateRecipeCategoryDto {
  @IsOptional()
  @IsString()
  @Matches(/\S/)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100000)
  description?: string;

  @IsOptional()
  @IsString()
  @Matches(/\S/)
  @MaxLength(255)
  metaTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  metaDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  metaKeywords?: string;

  @IsOptional()
  @IsUUID()
  parent?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  image?: string | null;

  @IsOptional()
  @IsBoolean()
  top?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  columns?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  seoKeyword?: string | null;
}