import nodemailer from "nodemailer";
import * as dotenv from "dotenv";

dotenv.config();

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

// Prefer SendGrid (HTTP API over 443) when available; fallback to SMTP
const hasSendgrid = !!process.env.SENDGRID_API_KEY;
let sgMail: any = null;
if (hasSendgrid) {
  try {
    // Use require to avoid type dependency at build time
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    sgMail = require("@sendgrid/mail");
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  } catch (e) {
    sgMail = null;
  }
}

const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER;

let transporter: nodemailer.Transporter | null = null;
if (!sgMail) {
  const smtpPort = parseInt(process.env.SMTP_PORT || "587");
  transporter = nodemailer.createTransport({
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

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  if (sgMail) {
    if (!fromEmail) {
      throw new Error(
        "FROM_EMAIL is required when using SendGrid. Set FROM_EMAIL in env."
      );
    }
    try {
      await sgMail.send({
        to: options.to,
        from: fromEmail,
        subject: options.subject,
        html: options.html,
      });
      return;
    } catch (err: any) {
      const sgErrors = err?.response?.body?.errors;
      if (Array.isArray(sgErrors) && sgErrors.length > 0) {
        const msg = sgErrors
          .map((e: any) => `${e.message}${e.field ? ` [${e.field}]` : ""}`)
          .join("; ");
        throw new Error(`SendGrid error: ${msg}`);
      }
      throw err;
    }
  }

  if (!transporter) {
    throw new Error("Email transporter is not configured");
  }

  await transporter.sendMail({
    from: `"Grocery Store" <${fromEmail}>`,
    ...options,
  });
};

export const sendPasswordResetOtp = async (
  email: string,
  otp: string
): Promise<void> => {
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

  await sendEmail({ to: email, subject, html });
};
