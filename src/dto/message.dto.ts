import { ArrayNotEmpty, IsArray, IsString, IsUUID } from "class-validator";

export class UpsertMessageDto {
  @IsString()
  key: string;

  @IsString()
  message: string;
}

export class LinkProductsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID("4", { each: true })
  productIds: string[];
}

export class SetProductsDto {
  @IsArray()
  @IsUUID("4", { each: true })
  productIds: string[];
}
