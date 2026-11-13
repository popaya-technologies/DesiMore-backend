import { Router } from "express";
import { ShippingController } from "../controllers/shipping.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();
router.post("/quote", authenticate, ShippingController.quote);
router.post("/select", authenticate, ShippingController.select);
export default router;
