"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// app.ts
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const rbac_routes_1 = __importDefault(require("./routes/rbac.routes"));
const product_routes_1 = __importDefault(require("./routes/product.routes"));
const category_routes_1 = __importDefault(require("./routes/category.routes"));
const brand_routes_1 = __importDefault(require("./routes/brand.routes"));
const cart_routes_1 = __importDefault(require("./routes/cart.routes"));
const order_routes_1 = __importDefault(require("./routes/order.routes"));
const payment_routes_1 = __importDefault(require("./routes/payment.routes"));
const wishlist_routes_1 = __importDefault(require("./routes/wishlist.routes"));
const wholesale_order_routes_1 = __importDefault(require("./routes/wholesale-order.routes"));
const parent_category_routes_1 = __importDefault(require("./routes/parent-category.routes"));
const upload_routes_1 = __importDefault(require("./routes/upload.routes"));
const message_routes_1 = __importDefault(require("./routes/message.routes"));
const auth_middleware_1 = require("./middlewares/auth.middleware");
const rbac_middleware_1 = require("./middlewares/rbac.middleware");
const cors_1 = __importDefault(require("cors"));
const upload_config_1 = require("./utils/upload-config");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const app = (0, express_1.default)();
// Middleware
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use((0, cors_1.default)({
    origin: "*",
    credentials: false,
}));
// Ensure uploads directory exists and serve it publicly
(0, upload_config_1.ensureUploadDir)();
app.use("/uploads", express_1.default.static(upload_config_1.UPLOAD_DIR));
// Serve catalog assets (if present) publicly at /catalog
const CATALOG_DIR = path_1.default.resolve(process.cwd(), "catalog");
if (fs_1.default.existsSync(CATALOG_DIR)) {
    app.use("/catalog", express_1.default.static(CATALOG_DIR));
}
// Routes
app.use("/api/auth", auth_routes_1.default);
app.use("/api/rbac", rbac_routes_1.default);
app.use("/api/products", product_routes_1.default);
app.use("/api/categories", category_routes_1.default);
app.use("/api/parent-categories", parent_category_routes_1.default);
app.use("/api/brands", brand_routes_1.default);
app.use("/api/cart", cart_routes_1.default);
app.use("/api/wishlist", wishlist_routes_1.default);
app.use("/api/orders", order_routes_1.default);
app.use("/api/payments", payment_routes_1.default);
app.use("/api/wholesale-orders", wholesale_order_routes_1.default);
app.use("/api/uploads", upload_routes_1.default);
app.use("/api/messages", message_routes_1.default);
// Protected route example
app.get("/api/auth/me", auth_middleware_1.authenticate, (req, res) => {
    res.json({ user: req.user });
});
// Example protected route with RBAC
app.get("/api/admin/dashboard", auth_middleware_1.authenticate, (0, rbac_middleware_1.checkPermission)("dashboard", "read"), (req, res) => {
    res.json({ message: "Welcome to admin dashboard" });
});
exports.default = app;
