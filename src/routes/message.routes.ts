import { Router } from "express";
import { MessageController } from "../controllers/message.controller";

const router = Router();

// Create/update a message for a given key (no auth restriction)
router.post("/", MessageController.upsertMessage);
router.put("/", MessageController.upsertMessage);

// Public fetch by key (for frontend banners, etc.)
router.get("/", MessageController.getAllMessages);
router.get("/:key", MessageController.getMessageByKey);

export default router;
