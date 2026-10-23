import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";

// An empty string clears the code; otherwise it must be letters only.
const ISO2_PATTERN = /^([A-Za-z]{2})?$/;
const ISO3_PATTERN = /^([A-Za-z]{3})?$/;

export class CreateCountryDto {
  @IsString()
  @IsNotEmpty({ message: "Country name is required" })
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsOptional()
  @Matches(ISO2_PATTERN, {
    message: "ISO Code (2) must be exactly 2 letters",
  })
  isoCode2?: string;

  @IsString()
  @IsOptional()
  @Matches(ISO3_PATTERN, {
    message: "ISO Code (3) must be exactly 3 letters",
  })
  isoCode3?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  addressFormat?: string;

  @IsBoolean()
  postcodeRequired!: boolean;

  @IsBoolean()
  status!: boolean;
}

export class UpdateCountryDto {
  @IsString()
  @IsNotEmpty({ message: "Country name is required" })
  @MaxLength(255)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @Matches(ISO2_PATTERN, {
    message: "ISO Code (2) must be exactly 2 letters",
  })
  isoCode2?: string;

  @IsString()
  @IsOptional()
  @Matches(ISO3_PATTERN, {
    message: "ISO Code (3) must be exactly 3 letters",
  })
  isoCode3?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  addressFormat?: string;

  @IsBoolean()
  @IsOptional()
  postcodeRequired?: boolean;

  @IsBoolean()
  @IsOptional()
  status?: boolean;
}
