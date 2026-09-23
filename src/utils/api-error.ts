import { Response } from "express";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors?: unknown,
  ) {
    super(message);
  }
}
export const respondError = (res: Response, error: any) => {
  if (error instanceof ApiError) {
    res
      .status(error.status)
      .json({
        message: error.message,
        ...(error.errors ? { errors: error.errors } : {}),
      });
    return;
  }
  if (["23505", "23503"].includes(error.code)) {
    res.status(409).json({ message: "Conflicting or referenced data" });
    return;
  }
  if (error.code === "22P02") {
    res.status(400).json({ message: "Invalid identifier or value" });
    return;
  }
  console.error(error);
  res.status(500).json({ message: "Internal server error" });
};
