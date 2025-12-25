import { generateAccessToken, generateRefreshToken } from "./jwt";
import { Response } from "express";
import * as dotenv from "dotenv";

dotenv.config();

export const setTokens = (res: Response, userId: string, email: string) => {
  const accessToken = generateAccessToken({ userId, email });
  const refreshToken = generateRefreshToken({ userId, email });

  // Set cookies
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    // Align cookie lifetime with JWT expiry of 10 hours
    maxAge: 10 * 60 * 60 * 1000,
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return { accessToken, refreshToken };
};

export const clearTokens = (res: Response) => {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
};
