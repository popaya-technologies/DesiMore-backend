import { Router } from "express";
import { MessageController } from "../controllers/message.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission, requireStaff } from "../middlewares/rbac.middleware";

const router = Router();

// Writes change what every visitor sees: staff with Ticker Messages edit access only.
const staffWrite = [
  authenticate,
  requireStaff,
  checkPermission("message", "update"),
];

// Create/update a message for a given key
router.post("/", ...staffWrite, MessageController.upsertMessage);
router.put("/", ...staffWrite, MessageController.upsertMessage);

// Public fetch by key (for frontend banners, etc.)
router.get("/", MessageController.getAllMessages);

// Products linked to a ticker/tipper message key
router.get("/:key/products", MessageController.getMessageProducts);
router.post(
  "/:key/products",
  ...staffWrite,
  MessageController.addProductsToMessage
);
router.put(
  "/:key/products",
  ...staffWrite,
  MessageController.setMessageProducts
);
router.delete(
  "/:key/products/:productId",
  ...staffWrite,
  MessageController.removeProductFromMessage
);

router.get("/:key", MessageController.getMessageByKey);

export default router;
