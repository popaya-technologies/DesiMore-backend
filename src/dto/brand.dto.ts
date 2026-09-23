import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Matches,
} from "class-validator";

export class CreateBrandDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsInt()
  @Min(0)
  sortOrder!: number;

  @IsString()
  @Matches(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    {
      message:
        "Keyword must contain only lowercase letters, numbers, and hyphens",
    },
  )
  keyword!: string;
}

export class UpdateBrandDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @IsString()
  @Matches(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    {
      message:
        "Keyword must contain only lowercase letters, numbers, and hyphens",
    },
  )
  @IsOptional()
  keyword?: string;
}