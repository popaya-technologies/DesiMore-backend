import {
  IsUUID,
  IsArray,
  ArrayUnique,
  ArrayMaxSize,
  IsString,
  MaxLength,
  ValidateIf,
} from "class-validator";
export class SelectedOptionDto {
  @IsUUID() optionId: string;
  @ValidateIf((_, value) => value !== undefined)
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(100)
  @IsUUID(undefined, { each: true })
  valueIds?: string[];
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(2000)
  text?: string;
}
