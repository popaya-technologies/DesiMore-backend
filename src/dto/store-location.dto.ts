import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateStoreLocationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  storeName!: string;

  @IsString()
  @MinLength(1)
  address!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  geocode?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  telephone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  fax?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  image?: string;

  @IsOptional()
  @IsString()
  openingTimes?: string;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class UpdateStoreLocationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  storeName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  geocode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  telephone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  fax?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  image?: string;

  @IsOptional()
  @IsString()
  openingTimes?: string;

  @IsOptional()
  @IsString()
  comment?: string;
}
