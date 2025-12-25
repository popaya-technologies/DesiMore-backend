// src/types/auth-context.ts
import { User } from "../entities/user.entity";
import { Role } from "../entities/role.entity";
import { Permission } from "../entities/permission.entity";

export type AuthenticatedUser = User & {
  roles: Role[];
  permissions: Permission[];
};
