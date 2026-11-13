import { IsBoolean, IsEmail } from "class-validator";

export class SubscribeNewsletterDto {
  @IsEmail()
  email: string;
}

export class UpdateNewsletterPreferenceDto {
  @IsBoolean()
  subscribed: boolean;
}
