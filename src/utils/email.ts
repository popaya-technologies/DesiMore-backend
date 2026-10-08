import nodemailer from "nodemailer";
import * as dotenv from "dotenv";

dotenv.config();

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER;
const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  requireTLS: smtpPort !== 465,
  tls: { minVersion: "TLSv1.2" },
});

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  const missingConfig = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"].filter(
    (name) => !process.env[name]
  );
  if (!fromEmail) missingConfig.push("FROM_EMAIL");

  if (missingConfig.length > 0) {
    throw new Error(
      `SMTP is not configured. Missing environment variables: ${missingConfig.join(", ")}`
    );
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
