import {
  IsUUID,
  IsString,
  MaxLength,
  ValidateIf,
} from "class-validator";

export class CreateCustomerApprovalDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  customerGroupId: string;
}

export class ReviewCustomerApprovalDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(10000)
  comment?: string;
}