// routes/auth.routes.ts
import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth.middleware";
import {
  checkPermission,
  checkPermissionOnAny,
  requireStaff,
} from "../middlewares/rbac.middleware";

const router = Router();

router.post("/register", AuthController.register);
router.post("/register/wholesaler", AuthController.registerWholesaler);
router.post("/login", AuthController.login);
router.post("/logout", AuthController.logout);
router.post("/refresh-token", AuthController.refreshToken);
router.post("/request-password-reset", AuthController.requestPasswordReset);
router.post("/reset-password", AuthController.resetPassword);
router.get("/me", authenticate, AuthController.getMe);
router.patch("/me", authenticate, AuthController.updateMe);
// Customer records are staff-only; shoppers read their own profile via /me.
// The admin Wholesalers page and Orders table also read these records.
const readCustomerRecords = checkPermissionOnAny(
  ["user", "wholesale-order-request", "order"],
  "read"
);
router.get(
  "/users",
  authenticate,
  requireStaff,
  readCustomerRecords,
  AuthController.getAllUsers
);
router.get(
  "/users/:id",
  authenticate,
  requireStaff,
  readCustomerRecords,
  AuthController.getUserById
);
router.delete(
  "/users/:id",
  authenticate,
  requireStaff,
  checkPermission("user", "delete"),
  AuthController.deleteUser
);
// Admin Customers screen: create / edit customer accounts.
router.post(
  "/users",
  authenticate,
  requireStaff,
  checkPermission("user", "create"),
  AuthController.adminCreateCustomer
);
router.put(
  "/users/:id",
  authenticate,
  requireStaff,
  checkPermission("user", "update"),
  AuthController.adminUpdateCustomer
);

export default router;
