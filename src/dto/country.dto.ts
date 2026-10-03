import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateCountryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(2)
  isoCode2?: string;

  @IsString()
  @IsOptional()
  @MaxLength(3)
  isoCode3?: string;

  @IsString()
  @IsOptional()
  addressFormat?: string;

  @IsBoolean()
  postcodeRequired!: boolean;

  @IsBoolean()
  status!: boolean;
}

export class UpdateCountryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2)
  isoCode2?: string;

  @IsString()
  @IsOptional()
  @MaxLength(3)
  isoCode3?: string;

  @IsString()
  @IsOptional()
  addressFormat?: string;

  @IsBoolean()
  @IsOptional()
  postcodeRequired?: boolean;

  @IsBoolean()
  @IsOptional()
  status?: boolean;
}