import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from "class-validator";

export class CreateOrderStatusDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "code must contain lowercase letters, numbers, and hyphens only",
  })
  code!: string;

  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: "color must be a valid hex color" })
  color!: string;

  @IsInt()
  @Min(0)
  sortOrder!: number;

  @IsBoolean()
  isActive!: boolean;

  @IsBoolean()
  isDefault!: boolean;
}

export class UpdateOrderStatusDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @IsOptional()
  name?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "code must contain lowercase letters, numbers, and hyphens only",
  })
  @IsOptional()
  code?: string;

  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: "color must be a valid hex color" })
  @IsOptional()
  color?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
