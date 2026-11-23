import { IsEmail, IsIn, IsOptional, IsPhoneNumber, IsString, MaxLength, MinLength } from "class-validator";

export class UpdateProfileDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @IsOptional()
  firstname?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @IsOptional()
  lastname?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @IsOptional()
  username?: string;

  @IsEmail()
  @MaxLength(255)
  @IsOptional()
  email?: string;

  @IsPhoneNumber()
  @IsOptional()
  phone?: string;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  avatar?: string;
}

// Admin "Customers" screen: only shopper roles may be created or set here.
export const ADMIN_CUSTOMER_ROLES = ["user", "customer"] as const;

export class AdminCreateCustomerDto {
  @IsIn(ADMIN_CUSTOMER_ROLES as unknown as string[], {
    message: "User Role must be User or Customer",
  })
  user_role!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstname!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lastname!: string;

  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsPhoneNumber()
  phone!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password!: string;
}

export class AdminUpdateCustomerDto extends UpdateProfileDto {
  @IsOptional()
  @IsIn(ADMIN_CUSTOMER_ROLES as unknown as string[], {
    message: "User Role must be User or Customer",
  })
  user_role?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password?: string;
}
