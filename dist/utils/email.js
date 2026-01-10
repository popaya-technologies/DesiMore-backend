"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPasswordResetOtp = exports.sendEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
// Prefer SendGrid (HTTP API over 443) when available; fallback to SMTP
const hasSendgrid = !!process.env.SENDGRID_API_KEY;
let sgMail = null;
if (hasSendgrid) {
    try {
        // Use require to avoid type dependency at build time
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        sgMail = require("@sendgrid/mail");
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }
    catch (e) {
        sgMail = null;
    }
}
const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER;
let transporter = null;
if (!sgMail) {
    const smtpPort = parseInt(process.env.SMTP_PORT || "587");
    transporter = nodemailer_1.default.createTransport({
        host: process.env.SMTP_HOST,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        requireTLS: true,
        tls: { minVersion: "TLSv1.2" },
    });
}
const sendEmail = (options) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    if (sgMail) {
        if (!fromEmail) {
            throw new Error("FROM_EMAIL is required when using SendGrid. Set FROM_EMAIL in env.");
        }
        try {
            yield sgMail.send({
                to: options.to,
                from: fromEmail,
                subject: options.subject,
                html: options.html,
            });
            return;
        }
        catch (err) {
            const sgErrors = (_b = (_a = err === null || err === void 0 ? void 0 : err.response) === null || _a === void 0 ? void 0 : _a.body) === null || _b === void 0 ? void 0 : _b.errors;
            if (Array.isArray(sgErrors) && sgErrors.length > 0) {
                const msg = sgErrors
                    .map((e) => `${e.message}${e.field ? ` [${e.field}]` : ""}`)
                    .join("; ");
                throw new Error(`SendGrid error: ${msg}`);
            }
            throw err;
        }
    }
    if (!transporter) {
        throw new Error("Email transporter is not configured");
    }
    yield transporter.sendMail(Object.assign({ from: `"Grocery Store" <${fromEmail}>` }, options));
});
exports.sendEmail = sendEmail;
const sendPasswordResetOtp = (email, otp) => __awaiter(void 0, void 0, void 0, function* () {
    const subject = "Password Reset OTP";
    const html = `
   <div style="max-width: 600px; margin: auto; padding: 20px; font-family: Arial, sans-serif; background-color: #f8f9fa; border-radius: 8px; border: 1px solid #e0e0e0;">
  <h2 style="color: #333; text-align: center;">🔒 Password Reset Request</h2>

  <p style="font-size: 16px; color: #555;">
    We received a request to reset your password. Use the OTP below to proceed:
  </p>

  <div style="text-align: center; margin: 24px 0;">
    <span style="display: inline-block; font-size: 24px; padding: 10px 20px; background-color: #007bff; color: white; border-radius: 6px; letter-spacing: 2px;">
      <strong>${otp}</strong>
    </span>
  </div>

  <p style="font-size: 14px; color: #777;">
    This OTP is valid for <strong>10 minutes</strong>. If you did not request a password reset, please ignore this email.
  </p>

  <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />

  <p style="font-size: 12px; color: #999; text-align: center;">
    &copy; ${new Date().getFullYear()} Your Company. All rights reserved.
  </p>
</div>

  `;
    yield (0, exports.sendEmail)({ to: email, subject, html });
});
exports.sendPasswordResetOtp = sendPasswordResetOtp;
