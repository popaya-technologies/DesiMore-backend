import { Router } from "express";
import { NewsletterController } from "../controllers/newsletter.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.post("/subscribe", NewsletterController.subscribe);
router.get("/me", authenticate, NewsletterController.getMyPreference);
router.put("/me", authenticate, NewsletterController.updateMyPreference);

export default router;
