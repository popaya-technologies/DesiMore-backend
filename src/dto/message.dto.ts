import { IsString } from "class-validator";

export class UpsertMessageDto {
  @IsString()
  key: string;

  @IsString()
  message: string;
}
