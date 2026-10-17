import {
  IsString,
  IsOptional,
  IsNotEmpty,
  Matches,
  MaxLength,
} from "class-validator";

const SEO_KEYWORD_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateSeoUrlDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: "query must not be blank" })
  @MaxLength(500)
  query!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(SEO_KEYWORD_PATTERN, {
    message: "keyword must contain lowercase letters, numbers and single hyphens only",
  })
  @MaxLength(500)
  keyword!: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @Matches(/\S/, { message: "store must not be blank" })
  @MaxLength(255)
  store?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @Matches(/\S/, { message: "language must not be blank" })
  @MaxLength(255)
  language?: string;
}

export class UpdateSeoUrlDto {
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @Matches(/\S/, { message: "query must not be blank" })
  @MaxLength(500)
  query?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @Matches(/\S/, { message: "store must not be blank" })
  @Matches(SEO_KEYWORD_PATTERN, {
    message: "keyword must contain lowercase letters, numbers and single hyphens only",
  })
  @MaxLength(500)
  keyword?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @Matches(/\S/, { message: "language must not be blank" })
  @MaxLength(255)
  store?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @MaxLength(255)
  language?: string;
}
