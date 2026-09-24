import {
  IsString,
  IsBoolean,
  IsOptional,
  IsInt,
  IsUUID,
  Matches,
  Min,
} from "class-validator";

const keywordRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateCategoryDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder?: number;

  @IsUUID()
  @IsOptional()
  parentCategoryId?: string;

  // SEO
  @IsString()
  metaTitle: string;

  @IsString()
  @IsOptional()
  metaDescription?: string;

  @IsString()
  @IsOptional()
  metaKeywords?: string;

  @IsString()
  @Matches(keywordRegex, {
    message: "Use lowercase letters, numbers, and hyphens without spaces",
  })
  keyword: string;
}

export class UpdateCategoryDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder?: number;

  @IsUUID()
  @IsOptional()
  parentCategoryId?: string | null;

  // SEO
  @IsString()
  @IsOptional()
  metaTitle?: string;

  @IsString()
  @IsOptional()
  metaDescription?: string;

  @IsString()
  @IsOptional()
  metaKeywords?: string;

  @IsString()
  @Matches(keywordRegex, {
    message: "Use lowercase letters, numbers, and hyphens without spaces",
  })
  @IsOptional()
  keyword?: string;
}
