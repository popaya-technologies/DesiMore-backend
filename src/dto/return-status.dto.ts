import { IsString, Matches, MaxLength, IsArray, ArrayMinSize, ArrayMaxSize, ArrayUnique, IsUUID } from "class-validator";
export class CreateReturnStatusDto {
  @IsString() @Matches(/\S/) @MaxLength(100) name: string;
}
export class UpdateReturnStatusDto extends CreateReturnStatusDto {}
export class BulkDeleteReturnStatusDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100)
  @ArrayUnique((id: unknown) => typeof id === "string" ? id.toLowerCase() : id)
  @IsUUID("all", { each: true }) ids: string[];
}
