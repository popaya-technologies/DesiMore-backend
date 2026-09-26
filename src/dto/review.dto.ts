import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class CreateReviewDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  author!: string;

  @IsUUID()
  productId!: string;

  @IsString()
  @IsNotEmpty()
  text!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsDateString()
  dateAdded!: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateReviewDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @IsOptional()
  author?: string;

  @IsUUID()
  @IsOptional()
  productId?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  text?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  rating?: number;

  @IsDateString()
  @IsOptional()
  dateAdded?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
