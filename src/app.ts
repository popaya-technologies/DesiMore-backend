// app.ts
import express from "express";
import returnStatusRoutes from "./routes/return-status.routes";
import customerGroupRoutes from "./routes/customer-group.routes";
import customerApprovalRoutes from "./routes/customer-approval.routes";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes";
import rbacRoutes from "./routes/rbac.routes";
import productRoutes from "./routes/product.routes";
import categoryRoutes from "./routes/category.routes";
import brandRoutes from "./routes/brand.routes";
import cartRoutes from "./routes/cart.routes";
import orderRoutes from "./routes/order.routes";
import cancelledOrderRoutes from "./routes/cancelled-order.routes";
import paymentRoutes from "./routes/payment.routes";
import wishlistRoutes from "./routes/wishlist.routes";
import wholesaleOrderRoutes from "./routes/wholesale-order.routes";
import parentCategoryRoutes from "./routes/parent-category.routes";
import uploadRoutes from "./routes/upload.routes";
import messageRoutes from "./routes/message.routes";
import downloadRoutes from "./routes/download.routes";
import faqRoutes from "./routes/faq.routes";
import carrierRoutes from "./routes/carrier.routes";
import giftVoucherRoutes from "./routes/gift_voucher.routes";
import voucherThemeRoutes from "./routes/voucher_theme.routes";
import couponRoutes from "./routes/coupon.routes";
import reviewRoutes from "./routes/review.routes";
import mailRoutes from "./routes/mail.routes";
import bannerRoutes from "./routes/banner.routes";
import seoUrlRoutes from "./routes/seo-url.routes";
import languageEditorRoutes from "./routes/language-editor.routes";
import attributeRoutes from "./routes/attribute.routes";
import attributeGroupRoutes from "./routes/attribute-group.routes";
import optionRoutes from "./routes/option.routes";
import filterRoutes from "./routes/filter.routes";
import productReturnRoutes from "./routes/product-return.routes";
import recipeRoutes from "./routes/recipe.routes";
import recipeCategoryRoutes from "./routes/recipe-category.routes";
import storeRoutes from "./routes/store.routes";
import systemUserRoutes from "./routes/system-user.routes";
import systemUserGroupRoutes from "./routes/system-user-group.routes";
import storeLocationRoutes from "./routes/store-location.routes";
import systemLanguageRoutes from "./routes/system-language.routes";
import currencyRoutes from "./routes/currency.routes";
import stockStatusRoutes from "./routes/stock-status.routes";
import orderStatusRoutes from "./routes/order-status.routes";
import returnActionRoutes from "./routes/return-action.routes";
import returnReasonRoutes from "./routes/return-reason.routes";
import { authenticate } from "./middlewares/auth.middleware";
import { checkPermission } from "./middlewares/rbac.middleware";
import cors from "cors";
import { ensureUploadDir, UPLOAD_DIR } from "./utils/upload-config";
import path from "path";
import fs from "fs";

const app = express();

// Middleware
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(
  cors({
    origin: "*",
    credentials: false,
  }),
);

// Ensure uploads directory exists and serve it publicly
ensureUploadDir();
app.use(
  "/uploads",
  express.static(UPLOAD_DIR, {
    setHeaders: (res) => {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    },
  }),
);

// Serve catalog assets (if present) publicly at /catalog
const CATALOG_DIR = path.resolve(process.cwd(), "catalog");
if (fs.existsSync(CATALOG_DIR)) {
  app.use(
    "/catalog",
    express.static(CATALOG_DIR, {
      setHeaders: (res) => {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      },
    }),
  );
}

// Routes
app.use("/api/return-statuses", returnStatusRoutes);
app.use("/api/customer-groups", customerGroupRoutes);
app.use("/api/customer-approvals", customerApprovalRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/rbac", rbacRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/parent-categories", parentCategoryRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/cancelled-orders", cancelledOrderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/wholesale-orders", wholesaleOrderRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/downloads", downloadRoutes);
app.use("/api/faqs", faqRoutes);
app.use("/api/carriers", carrierRoutes);
app.use("/api/gift-vouchers", giftVoucherRoutes);
app.use("/api/voucher-themes", voucherThemeRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/mail", mailRoutes);
app.use("/api/banners", bannerRoutes);
app.use("/api/seo-urls", seoUrlRoutes);
app.use("/api/language-editor", languageEditorRoutes);
app.use("/api/attributes", attributeRoutes);
app.use("/api/attribute-groups", attributeGroupRoutes);
app.use("/api/options", optionRoutes);
app.use("/api/filters", filterRoutes);
app.use("/api/product-returns", productReturnRoutes);
app.use("/api/recipes", recipeRoutes);
app.use("/api/recipe-categories", recipeCategoryRoutes);
app.use("/api/stores", storeRoutes);
app.use("/api/system-users", systemUserRoutes);
app.use("/api/system-user-groups", systemUserGroupRoutes);
app.use("/api/store-locations", storeLocationRoutes);
app.use("/api/system-languages", systemLanguageRoutes);
app.use("/api/currencies", currencyRoutes);
app.use("/api/stock-statuses", stockStatusRoutes);
app.use("/api/order-statuses", orderStatusRoutes);
app.use("/api/return-actions", returnActionRoutes);
app.use("/api/return-reasons", returnReasonRoutes);

// Example protected route with RBAC
app.get(
  "/api/admin/dashboard",
  authenticate,
  checkPermission("dashboard", "read"),
  (req, res) => {
    res.json({ message: "Welcome to admin dashboard" });
  },
);

export default app;
