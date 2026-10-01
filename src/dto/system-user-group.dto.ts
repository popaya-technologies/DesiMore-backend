import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateSystemUserGroupDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;
}

export class UpdateSystemUserGroupDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @IsOptional()
  name?: string;
}