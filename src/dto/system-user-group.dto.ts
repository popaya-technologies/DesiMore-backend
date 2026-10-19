import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { SYSTEM_USER_PERMISSION_IDS } from "../constants/system-user-permissions";

export class CreateSystemUserGroupDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @IsArray()
  @ArrayUnique()
  @IsIn(SYSTEM_USER_PERMISSION_IDS, { each: true })
  accessPermissions!: string[];

  @IsArray()
  @ArrayUnique()
  @IsIn(SYSTEM_USER_PERMISSION_IDS, { each: true })
  modifyPermissions!: string[];
}

export class UpdateSystemUserGroupDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @IsOptional()
  name?: string;

  @IsArray()
  @ArrayUnique()
  @IsIn(SYSTEM_USER_PERMISSION_IDS, { each: true })
  accessPermissions!: string[];

  @IsArray()
  @ArrayUnique()
  @IsIn(SYSTEM_USER_PERMISSION_IDS, { each: true })
  modifyPermissions!: string[];
}
