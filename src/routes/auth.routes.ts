// routes/auth.routes.ts
import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";

const router = Router();

router.post("/register", AuthController.register);
router.post("/register/wholesaler", AuthController.registerWholesaler);
router.post("/login", AuthController.login);
router.post("/logout", AuthController.logout);
router.post("/refresh-token", AuthController.refreshToken);
router.post("/request-password-reset", AuthController.requestPasswordReset);
router.post("/reset-password", AuthController.resetPassword);
router.get("/users", AuthController.getAllUsers);
router.get("/users/:id", AuthController.getUserById);
router.delete(
  "/users/:id",
  authenticate,
  checkPermission("user", "delete"),
  AuthController.deleteUser
);

export default router;
