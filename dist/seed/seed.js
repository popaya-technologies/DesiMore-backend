"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const data_source_1 = require("../data-source");
const category_entity_1 = require("../entities/category.entity");
const brand_entity_1 = require("../entities/brand.entity");
const user_entity_1 = require("../entities/user.entity");
const rbac_service_1 = require("../services/rbac.service");
const role_permission_entity_1 = require("../entities/role-permission.entity");
const user_role_entity_1 = require("../entities/user-role.entity");
function seed() {
    return __awaiter(this, void 0, void 0, function* () {
        yield data_source_1.AppDataSource.initialize();
        const rolePermissionRepository = data_source_1.AppDataSource.getRepository(role_permission_entity_1.RolePermission);
        const userRoleRepository = data_source_1.AppDataSource.getRepository(user_role_entity_1.UserRole);
        const ensureRole = (name, description) => __awaiter(this, void 0, void 0, function* () {
            const existing = yield rbac_service_1.RBACService.getRoleByName(name);
            if (existing) {
                return existing;
            }
            return rbac_service_1.RBACService.createRole(name, description);
        });
        const ensurePermission = (_a) => __awaiter(this, [_a], void 0, function* ({ name, resource, action, }) {
            const existing = yield rbac_service_1.RBACService.getPermissionByName(name);
            if (existing) {
                return existing;
            }
            return rbac_service_1.RBACService.createPermission(name, resource, action, `Permission to ${action} ${resource}`);
        });
        const assignPermissionsToRole = (roleId, permissionIds) => __awaiter(this, void 0, void 0, function* () {
            if (!permissionIds.length) {
                return;
            }
            const existing = yield rolePermissionRepository.find({
                where: { roleId },
            });
            const existingIds = new Set(existing.map((rp) => rp.permissionId));
            for (const permissionId of permissionIds) {
                if (!existingIds.has(permissionId)) {
                    yield rbac_service_1.RBACService.assignPermissionToRole(roleId, permissionId);
                    existingIds.add(permissionId);
                }
            }
        });
        const ensureUserRole = (userId, roleId) => __awaiter(this, void 0, void 0, function* () {
            const exists = yield userRoleRepository.findOne({
                where: { userId, roleId },
            });
            if (!exists) {
                yield rbac_service_1.RBACService.assignRoleToUser(userId, roleId);
            }
        });
        // Create basic roles
        const adminRole = yield ensureRole("admin", "Administrator with full access");
        const customerRole = yield ensureRole("customer", "Regular customer");
        const wholesalerRole = yield ensureRole("wholesaler", "Wholesale customer");
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
            const permission = yield ensurePermission(perm);
            createdPermissions.push(permission);
        }
        const permissionMap = new Map(createdPermissions.map((permission) => [permission.name, permission]));
        yield assignPermissionsToRole(adminRole.id, createdPermissions.map((permission) => permission.id));
        const basicCustomerPerms = createdPermissions.filter((p) => (p.resource === "product" && p.action === "read") ||
            (p.resource === "order" && ["create", "read"].includes(p.action)));
        yield assignPermissionsToRole(customerRole.id, basicCustomerPerms.map((permission) => permission.id));
        const wholesalerPermissionNames = [
            "read-product",
            "create-wholesale-order-request",
            "read-wholesale-order-request",
        ];
        const wholesalerPermissionIds = wholesalerPermissionNames
            .map((name) => permissionMap.get(name))
            .filter((permission) => Boolean(permission))
            .map((permission) => permission.id);
        yield assignPermissionsToRole(wholesalerRole.id, wholesalerPermissionIds);
        //category creation
        const categories = [
            { name: "Fruits & Vegetables", description: "Fresh fruits and vegetables" },
            { name: "Dairy & Eggs", description: "Milk, cheese, eggs and more" },
            { name: "Meat & Seafood", description: "Fresh meat and seafood" },
            { name: "Bakery", description: "Bread, cakes and pastries" },
            { name: "Beverages", description: "Drinks and juices" },
        ];
        const categoryRepository = data_source_1.AppDataSource.getRepository(category_entity_1.Category);
        for (const cat of categories) {
            const existing = yield categoryRepository.findOne({
                where: { name: cat.name },
            });
            if (!existing) {
                yield categoryRepository.save(categoryRepository.create(cat));
            }
        }
        const brands = [
            { name: "Fresh Harvest", description: "Trusted source for farm produce" },
            { name: "Daily Dairy", description: "Premium dairy partner" },
            { name: "Ocean Catch", description: "Seafood specialists" },
        ];
        const brandRepository = data_source_1.AppDataSource.getRepository(brand_entity_1.Brand);
        for (const brand of brands) {
            const existing = yield brandRepository.findOne({
                where: { name: brand.name },
            });
            if (!existing) {
                yield brandRepository.save(brandRepository.create(brand));
            }
        }
        //addmin creation
        const userRepository = data_source_1.AppDataSource.getRepository(user_entity_1.User);
        let admin = yield userRepository.findOne({
            where: { email: "poojan@popaya.in" },
        });
        if (!admin) {
            admin = new user_entity_1.User();
            admin.firstname = "Poojan";
            admin.lastname = "Shah";
            admin.username = "poojan23";
            admin.email = "poojan@popaya.in";
            admin.phone = "+919833729922";
            admin.userRole = "su";
            admin.setPassword("1234567");
            yield userRepository.save(admin);
        }
        // Assign admin role to admin user
        yield ensureUserRole(admin.id, adminRole.id);
        console.log("Database seeded successfully");
        console.log("Admin user created:");
        console.log(`Email: poojan@popaya.in`);
        console.log(`Password: 1234567`);
        process.exit(0);
    });
}
seed().catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
});
