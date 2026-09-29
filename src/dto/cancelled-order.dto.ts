import { IsEnum, IsBoolean, IsString, MaxLength, ValidateIf, IsArray, ArrayMinSize, ArrayMaxSize, ArrayUnique, IsUUID } from "class-validator";
import { OrderStatus } from "../entities/order.entity";

export class CancelledOrderHistoryDto {
  @IsEnum(OrderStatus) status: OrderStatus;
  @IsBoolean() override: boolean;
  @IsBoolean() notifyCustomer: boolean;
  @ValidateIf((_o, value) => value !== undefined)
  @IsString() @MaxLength(10000) comment?: string;
}
export class CancelledOrderBulkDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100)
  @ArrayUnique((id: unknown) => typeof id === "string" ? id.toLowerCase() : id)
  @IsUUID("all", { each: true }) ids: string[];
}
