import { Router } from "express";

import { CountryController } from "../controllers/country.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";

const router = Router();

router.post(
  "/",
  authenticate,
  checkPermission("country", "create"),
  CountryController.createCountry,
);

router.get(
  "/",
  authenticate,
  checkPermission("country", "read"),
  CountryController.getCountries,
);

router.get(
  "/:id",
  authenticate,
  checkPermission("country", "read"),
  CountryController.getCountryById,
);

router.put(
  "/:id",
  authenticate,
  checkPermission("country", "update"),
  CountryController.updateCountry,
);

router.delete(
  "/:id",
  authenticate,
  checkPermission("country", "delete"),
  CountryController.deleteCountry,
);

export default router;