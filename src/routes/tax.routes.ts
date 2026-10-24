import { Router } from "express";
import { TaxController } from "../controllers/tax.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();
router.post("/quote", authenticate, TaxController.quote);
export default router;
