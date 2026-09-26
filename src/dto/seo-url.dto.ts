import {
  IsString,
  IsOptional,
  MaxLength,
} from "class-validator";

export class CreateSeoUrlDto {
  @IsString()
  @MaxLength(500)
  query!: string;

  @IsString()
  @MaxLength(500)
  keyword!: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  store?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  language?: string;
}

export class UpdateSeoUrlDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  query?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  keyword?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  store?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  language?: string;
}