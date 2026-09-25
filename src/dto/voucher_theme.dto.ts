import { IsOptional, IsString, MaxLength } from "class-validator";

export class CreateVoucherThemeDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsString()
  @MaxLength(500)
  image!: string;
}

export class UpdateVoucherThemeDto {
  @IsString()
  @MaxLength(255)
  @IsOptional()
  name?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  image?: string;
}
