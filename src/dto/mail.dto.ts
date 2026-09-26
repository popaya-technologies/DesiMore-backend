import { IsIn, IsString, IsUUID, Matches, MaxLength } from "class-validator";
export class SendMailDto {
  @IsUUID() requestId: string;
  @IsIn(["default"]) from: string;
  @IsIn(["newsletter_subscribers"]) to: string;
  @IsString() @Matches(/\S/) @Matches(/^[^\r\n]*$/) @MaxLength(255) subject: string;
  @IsString() @Matches(/\S/) @MaxLength(100000) message: string;
}
