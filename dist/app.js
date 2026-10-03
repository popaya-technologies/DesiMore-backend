"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// app.ts
const express_1 = __importDefault(require("express"));
const return_status_routes_1 = __importDefault(require("./routes/return-status.routes"));
const customer_group_routes_1 = __importDefault(require("./routes/customer-group.routes"));
const customer_approval_routes_1 = __importDefault(require("./routes/customer-approval.routes"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const rbac_routes_1 = __importDefault(require("./routes/rbac.routes"));
const product_routes_1 = __importDefault(require("./routes/product.routes"));
const category_routes_1 = __importDefault(require("./routes/category.routes"));
const brand_routes_1 = __importDefault(require("./routes/brand.routes"));
const cart_routes_1 = __importDefault(require("./routes/cart.routes"));
const order_routes_1 = __importDefault(require("./routes/order.routes"));
const cancelled_order_routes_1 = __importDefault(require("./routes/cancelled-order.routes"));
const payment_routes_1 = __importDefault(require("./routes/payment.routes"));
const wishlist_routes_1 = __importDefault(require("./routes/wishlist.routes"));
const wholesale_order_routes_1 = __importDefault(require("./routes/wholesale-order.routes"));
const parent_category_routes_1 = __importDefault(require("./routes/parent-category.routes"));
const upload_routes_1 = __importDefault(require("./routes/upload.routes"));
const message_routes_1 = __importDefault(require("./routes/message.routes"));
const download_routes_1 = __importDefault(require("./routes/download.routes"));
const faq_routes_1 = __importDefault(require("./routes/faq.routes"));
const carrier_routes_1 = __importDefault(require("./routes/carrier.routes"));
const gift_voucher_routes_1 = __importDefault(require("./routes/gift_voucher.routes"));
const voucher_theme_routes_1 = __importDefault(require("./routes/voucher_theme.routes"));
const coupon_routes_1 = __importDefault(require("./routes/coupon.routes"));
const review_routes_1 = __importDefault(require("./routes/review.routes"));
const mail_routes_1 = __importDefault(require("./routes/mail.routes"));
const banner_routes_1 = __importDefault(require("./routes/banner.routes"));
const seo_url_routes_1 = __importDefault(require("./routes/seo-url.routes"));
const language_editor_routes_1 = __importDefault(require("./routes/language-editor.routes"));
const attribute_routes_1 = __importDefault(require("./routes/attribute.routes"));
const attribute_group_routes_1 = __importDefault(require("./routes/attribute-group.routes"));
const option_routes_1 = __importDefault(require("./routes/option.routes"));
const filter_routes_1 = __importDefault(require("./routes/filter.routes"));
const product_return_routes_1 = __importDefault(require("./routes/product-return.routes"));
const recipe_routes_1 = __importDefault(require("./routes/recipe.routes"));
const recipe_category_routes_1 = __importDefault(require("./routes/recipe-category.routes"));
const auth_middleware_1 = require("./middlewares/auth.middleware");
const rbac_middleware_1 = require("./middlewares/rbac.middleware");
const cors_1 = __importDefault(require("cors"));
const upload_config_1 = require("./utils/upload-config");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const app = (0, express_1.default)();
// Middleware
app.use(express_1.default.json({ limit: "2mb" }));
app.use((0, cookie_parser_1.default)());
app.use((0, cors_1.default)({
    origin: "*",
    credentials: false,
}));
// Ensure uploads directory exists and serve it publicly
(0, upload_config_1.ensureUploadDir)();
app.use("/uploads", express_1.default.static(upload_config_1.UPLOAD_DIR, {
    setHeaders: (res) => {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    },
}));
// Serve catalog assets (if present) publicly at /catalog
const CATALOG_DIR = path_1.default.resolve(process.cwd(), "catalog");
if (fs_1.default.existsSync(CATALOG_DIR)) {
    app.use("/catalog", express_1.default.static(CATALOG_DIR, {
        setHeaders: (res) => {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        },
    }));
}
// Routes
app.use("/api/return-statuses", return_status_routes_1.default);
app.use("/api/customer-groups", customer_group_routes_1.default);
app.use("/api/customer-approvals", customer_approval_routes_1.default);
app.use("/api/auth", auth_routes_1.default);
app.use("/api/rbac", rbac_routes_1.default);
app.use("/api/products", product_routes_1.default);
app.use("/api/categories", category_routes_1.default);
app.use("/api/parent-categories", parent_category_routes_1.default);
app.use("/api/brands", brand_routes_1.default);
app.use("/api/cart", cart_routes_1.default);
app.use("/api/wishlist", wishlist_routes_1.default);
app.use("/api/orders", order_routes_1.default);
app.use("/api/cancelled-orders", cancelled_order_routes_1.default);
app.use("/api/payments", payment_routes_1.default);
app.use("/api/wholesale-orders", wholesale_order_routes_1.default);
app.use("/api/uploads", upload_routes_1.default);
app.use("/api/messages", message_routes_1.default);
app.use("/api/downloads", download_routes_1.default);
app.use("/api/faqs", faq_routes_1.default);
app.use("/api/carriers", carrier_routes_1.default);
app.use("/api/gift-vouchers", gift_voucher_routes_1.default);
app.use("/api/voucher-themes", voucher_theme_routes_1.default);
app.use("/api/coupons", coupon_routes_1.default);
app.use("/api/reviews", review_routes_1.default);
app.use("/api/mail", mail_routes_1.default);
app.use("/api/banners", banner_routes_1.default);
app.use("/api/seo-urls", seo_url_routes_1.default);
app.use("/api/language-editor", language_editor_routes_1.default);
app.use("/api/attributes", attribute_routes_1.default);
app.use("/api/attribute-groups", attribute_group_routes_1.default);
app.use("/api/options", option_routes_1.default);
app.use("/api/filters", filter_routes_1.default);
app.use("/api/product-returns", product_return_routes_1.default);
app.use("/api/recipes", recipe_routes_1.default);
app.use("/api/recipe-categories", recipe_category_routes_1.default);
// Example protected route with RBAC
app.get("/api/admin/dashboard", auth_middleware_1.authenticate, (0, rbac_middleware_1.checkPermission)("dashboard", "read"), (req, res) => {
    res.json({ message: "Welcome to admin dashboard" });
});
exports.default = app;
