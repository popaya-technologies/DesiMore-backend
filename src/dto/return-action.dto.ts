import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateReturnActionDto {
  @IsString()
  @IsNotEmpty({ message: "Name is required" })
  @MaxLength(255)
  name!: string;
}

export class UpdateReturnActionDto {
  @IsString()
  @IsNotEmpty({ message: "Name is required" })
  @MaxLength(255)
  @IsOptional()
  name?: string;
}