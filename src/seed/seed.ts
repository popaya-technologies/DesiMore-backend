import { AppDataSource } from "../data-source";
import { Category } from "../entities/category.entity";
import { Brand } from "../entities/brand.entity";
import { User } from "../entities/user.entity";
import { RBACService } from "../services/rbac.service";
import { RolePermission } from "../entities/role-permission.entity";
import { UserRole } from "../entities/user-role.entity";

async function seed() {
  await AppDataSource.initialize();
  const rolePermissionRepository =
    AppDataSource.getRepository(RolePermission);
  const userRoleRepository = AppDataSource.getRepository(UserRole);

  const ensureRole = async (name: string, description?: string) => {
    const existing = await RBACService.getRoleByName(name);
    if (existing) {
      return existing;
    }
    return RBACService.createRole(name, description);
  };

  const ensurePermission = async ({
    name,
    resource,
    action,
  }: {
    name: string;
    resource: string;
    action: string;
  }) => {
    const existing = await RBACService.getPermissionByName(name);
    if (existing) {
      return existing;
    }
    return RBACService.createPermission(
      name,
      resource,
      action,
      `Permission to ${action} ${resource}`
    );
  };

  const assignPermissionsToRole = async (
    roleId: string,
    permissionIds: string[]
  ) => {
    if (!permissionIds.length) {
      return;
    }

    const existing = await rolePermissionRepository.find({
      where: { roleId },
    });
    const existingIds = new Set(existing.map((rp) => rp.permissionId));

    for (const permissionId of permissionIds) {
      if (!existingIds.has(permissionId)) {
        await RBACService.assignPermissionToRole(roleId, permissionId);
        existingIds.add(permissionId);
      }
    }
  };

  const ensureUserRole = async (userId: string, roleId: string) => {
    const exists = await userRoleRepository.findOne({
      where: { userId, roleId },
    });
    if (!exists) {
      await RBACService.assignRoleToUser(userId, roleId);
    }
  };

  // Create basic roles
  const adminRole = await ensureRole(
    "admin",
    "Administrator with full access"
  );
  const customerRole = await ensureRole("customer", "Regular customer");
  const wholesalerRole = await ensureRole(
    "wholesaler",
    "Wholesale customer"
  );

  // Create permissions
  const permissions = [
    // Role permissions
    { name: "create-role", resource: "role", action: "create" },
    { name: "read-role", resource: "role", action: "read" },
    { name: "update-role", resource: "role", action: "update" },
    { name: "delete-role", resource: "role", action: "delete" },

    // Permission permissions
    { name: "create-permission", resource: "permission", action: "create" },
    { name: "read-permission", resource: "permission", action: "read" },
    { name: "update-permission", resource: "permission", action: "update" },
    { name: "delete-permission", resource: "permission", action: "delete" },

    // User permissions
    { name: "create-user", resource: "user", action: "create" },
    { name: "read-user", resource: "user", action: "read" },
    { name: "update-user", resource: "user", action: "update" },
    { name: "delete-user", resource: "user", action: "delete" },

    // User-Role permissions
    { name: "create-user-role", resource: "user-role", action: "create" },
    { name: "read-user-role", resource: "user-role", action: "read" },
    { name: "delete-user-role", resource: "user-role", action: "delete" },

    // Role-Permission permissions
    {
      name: "create-role-permission",
      resource: "role-permission",
      action: "create",
    },
    {
      name: "read-role-permission",
      resource: "role-permission",
      action: "read",
    },
    {
      name: "delete-role-permission",
      resource: "role-permission",
      action: "delete",
    },

    // Product permissions
    { name: "create-product", resource: "product", action: "create" },
    { name: "read-product", resource: "product", action: "read" },
    { name: "update-product", resource: "product", action: "update" },
    { name: "delete-product", resource: "product", action: "delete" },

    // Order permissions
    { name: "create-order", resource: "order", action: "create" },
    { name: "read-order", resource: "order", action: "read" },
    { name: "update-order", resource: "order", action: "update" },
    { name: "delete-order", resource: "order", action: "delete" },

    // Category permissions
    { name: "create-category", resource: "category", action: "create" },
    { name: "read-category", resource: "category", action: "read" },
    { name: "update-category", resource: "category", action: "update" },
    { name: "delete-category", resource: "category", action: "delete" },

    // Parent category permissions
    {
      name: "create-parent-category",
      resource: "parent-category",
      action: "create",
    },
    {
      name: "read-parent-category",
      resource: "parent-category",
      action: "read",
    },
    {
      name: "update-parent-category",
      resource: "parent-category",
      action: "update",
    },
    {
      name: "delete-parent-category",
      resource: "parent-category",
      action: "delete",
    },

    // Brand permissions
    { name: "create-brand", resource: "brand", action: "create" },
    { name: "read-brand", resource: "brand", action: "read" },
    { name: "update-brand", resource: "brand", action: "update" },
    { name: "delete-brand", resource: "brand", action: "delete" },

    // Wholesale order request permissions
    {
      name: "create-wholesale-order-request",
      resource: "wholesale-order-request",
      action: "create",
    },
    {
      name: "read-wholesale-order-request",
      resource: "wholesale-order-request",
      action: "read",
    },
    {
      name: "read-all-wholesale-order-request",
      resource: "wholesale-order-request",
      action: "read-all",
    },
    {
      name: "update-wholesale-order-request",
      resource: "wholesale-order-request",
      action: "update-status",
    },
  ];

  const createdPermissions = [];
  for (const perm of permissions) {
    const permission = await ensurePermission(perm);
    createdPermissions.push(permission);
  }

  const permissionMap = new Map(
    createdPermissions.map((permission) => [permission.name, permission])
  );

  await assignPermissionsToRole(
    adminRole.id,
    createdPermissions.map((permission) => permission.id)
  );

  const basicCustomerPerms = createdPermissions.filter(
    (p) =>
      (p.resource === "product" && p.action === "read") ||
      (p.resource === "order" && ["create", "read"].includes(p.action))
  );

  await assignPermissionsToRole(
    customerRole.id,
    basicCustomerPerms.map((permission) => permission.id)
  );

  const wholesalerPermissionNames = [
    "read-product",
    "create-wholesale-order-request",
    "read-wholesale-order-request",
  ];
  const wholesalerPermissionIds = wholesalerPermissionNames
    .map((name) => permissionMap.get(name))
    .filter((permission): permission is typeof createdPermissions[number] =>
      Boolean(permission)
    )
    .map((permission) => permission.id);
  await assignPermissionsToRole(wholesalerRole.id, wholesalerPermissionIds);

  //category creation
  const categories = [
    { name: "Fruits & Vegetables", description: "Fresh fruits and vegetables" },
    { name: "Dairy & Eggs", description: "Milk, cheese, eggs and more" },
    { name: "Meat & Seafood", description: "Fresh meat and seafood" },
    { name: "Bakery", description: "Bread, cakes and pastries" },
    { name: "Beverages", description: "Drinks and juices" },
  ];

  const categoryRepository = AppDataSource.getRepository(Category);
  for (const cat of categories) {
    const existing = await categoryRepository.findOne({
      where: { name: cat.name },
    });
    if (!existing) {
      await categoryRepository.save(categoryRepository.create(cat));
    }
  }

  const brands = [
    { name: "Fresh Harvest", description: "Trusted source for farm produce" },
    { name: "Daily Dairy", description: "Premium dairy partner" },
    { name: "Ocean Catch", description: "Seafood specialists" },
  ];

  const brandRepository = AppDataSource.getRepository(Brand);
  for (const brand of brands) {
    const existing = await brandRepository.findOne({
      where: { name: brand.name },
    });
    if (!existing) {
      await brandRepository.save(brandRepository.create(brand));
    }
  }
  //addmin creation
  const userRepository = AppDataSource.getRepository(User);
  let admin = await userRepository.findOne({
    where: { email: "poojan@popaya.in" },
  });
  if (!admin) {
    admin = new User();
    admin.firstname = "Poojan";
    admin.lastname = "Shah";
    admin.username = "poojan23";
    admin.email = "poojan@popaya.in";
    admin.phone = "+919833729922";
    admin.userRole = "su";
    admin.setPassword("1234567");
    await userRepository.save(admin);
  }

  // Assign admin role to admin user
  await ensureUserRole(admin.id, adminRole.id);

  console.log("Database seeded successfully");
  console.log("Admin user created:");
  console.log(`Email: poojan@popaya.in`);
  console.log(`Password: 1234567`);

  process.exit(0);
}

seed().catch((error) => {
  console.error("Seeding failed:", error);
  process.exit(1);
});
