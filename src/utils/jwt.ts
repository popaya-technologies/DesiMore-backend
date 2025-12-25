import jwt from "jsonwebtoken";
import * as dotenv from "dotenv";

dotenv.config();

interface TokenPayload {
  userId: string;
  email: string;
}

const jwtOptions: jwt.SignOptions = {
  expiresIn: 10 * 60 * 60, // 10 hours in seconds
};

const refreshTokenOptions: jwt.SignOptions = {
  expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
};

//JWT GENERATION
export const generateAccessToken = (payload: TokenPayload): string => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }
  return jwt.sign(payload, process.env.JWT_SECRET, jwtOptions);
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error("JWT_REFRESH_SECRET is not defined in environment ");
  }

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, refreshTokenOptions);
};

//JWT VERIFICATION
export const verifyAccessToken = (token: string): TokenPayload => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }
  return jwt.verify(token, process.env.JWT_SECRET) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error(
      "JWT_REFRESH_SECRET is not defined in environment variables"
    );
  }
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET) as TokenPayload;
};
