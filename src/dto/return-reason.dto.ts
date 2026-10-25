import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateReturnReasonDto {
  @IsString()
  @IsNotEmpty({ message: "Name is required" })
  @MaxLength(255)
  name!: string;
}

export class UpdateReturnReasonDto {
  @IsString()
  @IsNotEmpty({ message: "Name is required" })
  @MaxLength(255)
  @IsOptional()
  name?: string;
}