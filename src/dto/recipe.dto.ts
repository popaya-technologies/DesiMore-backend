import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from "class-validator";

const supplied = (_: unknown, value: unknown) => value !== undefined;

export class RecipeImageDto {
  @IsString()
  @MaxLength(2048)
  image: string;

  @ValidateIf(supplied)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  sortOrder?: number;
}

export class CreateRecipeDto {
  @IsString() @Matches(/\S/) @MaxLength(255) name: string;
  @IsOptional() @IsString() @MaxLength(100000) description?: string;
  @IsString() @Matches(/\S/) @MaxLength(255) metaTitle: string;
  @IsOptional() @IsString() @MaxLength(1000) metaDescription?: string;
  @IsOptional() @IsString() @MaxLength(1000) metaKeywords?: string;
  @IsOptional() @IsInt() @Min(0) @Max(2147483647) sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @ValidateIf(supplied) image?: string | null;
  @IsOptional() @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => RecipeImageDto)
  additionalImages?: RecipeImageDto[];
  @IsOptional() @IsArray() @ArrayMaxSize(100) @IsString({ each: true }) categories?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(100) @IsString({ each: true }) relatedProducts?: string[];
  @IsOptional() @IsString() @MaxLength(255) seoKeyword?: string | null;
}

export class UpdateRecipeDto {
  @ValidateIf(supplied) @IsString() @Matches(/\S/) @MaxLength(255) name?: string;
  @ValidateIf(supplied) @IsString() @MaxLength(100000) description?: string;
  @ValidateIf(supplied) @IsString() @Matches(/\S/) @MaxLength(255) metaTitle?: string;
  @ValidateIf(supplied) @IsString() @MaxLength(1000) metaDescription?: string;
  @ValidateIf(supplied) @IsString() @MaxLength(1000) metaKeywords?: string;
  @ValidateIf(supplied) @IsInt() @Min(0) @Max(2147483647) sortOrder?: number;
  @ValidateIf(supplied) @IsBoolean() isActive?: boolean;
  @ValidateIf(supplied) image?: string | null;
  @ValidateIf(supplied) @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => RecipeImageDto)
  additionalImages?: RecipeImageDto[];
  @ValidateIf(supplied) @IsArray() @ArrayMaxSize(100) @IsString({ each: true }) categories?: string[];
  @ValidateIf(supplied) @IsArray() @ArrayMaxSize(100) @IsString({ each: true }) relatedProducts?: string[];
  @IsOptional() @IsString() @MaxLength(255) seoKeyword?: string | null;
}
