import { Request, Response } from "express";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import path from "path";
import fs from "fs";
import { AppDataSource } from "../data-source";
import { Download } from "../entities/download.entity";
import { Product } from "../entities/product.entity";
import { Order, PaymentStatus } from "../entities/order.entity";
import { DownloadDto } from "../dto/product.dto";
import { validateAssetUrl } from "../services/product.service";
import { ApiError, respondError } from "../utils/api-error";
export const DOWNLOAD_DIR = path.resolve(
  process.cwd(),
  process.env.DOWNLOAD_DIR || "private-downloads",
);
export const DownloadController = {
  list: async (_req: Request, res: Response) => {
    try {
      res.json(
        await AppDataSource.getRepository(Download).find({
          order: { name: "ASC" },
        }),
      );
    } catch (error) {
      respondError(res, error);
    }
  },
  create: async (req: Request, res: Response) => {
    try {
      const dto = plainToInstance(DownloadDto, req.body);
      const errors = await validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
        validationError: { target: false, value: false },
      });
      if (errors.length) throw new ApiError(400, "Invalid download", errors);
      validateAssetUrl(dto.url);
      res
        .status(201)
        .json(
          await AppDataSource.getRepository(Download).save(
            AppDataSource.getRepository(Download).create(dto),
          ),
        );
    } catch (error) {
      respondError(res, error);
    }
  },
  upload: async (req: Request, res: Response) => {
    const file = (req as any).file;
    try {
      if (!file) throw new ApiError(400, "File is required");
      const name = String(req.body.name || file.originalname).trim();
      if (!name || name.length > 255)
        throw new ApiError(400, "Name must contain 1 to 255 characters");
      const repo = AppDataSource.getRepository(Download);
      const record = repo.create({ name, url: "", storagePath: file.filename });
      await repo.save(record);
      record.url = "/api/downloads/" + record.id + "/content";
      await repo.save(record);
      const { storagePath, ...response } = record;
      res.status(201).json(response);
    } catch (error) {
      if (file) await fs.promises.unlink(file.path).catch(() => {});
      respondError(res, error);
    }
  },
  content: async (req: Request, res: Response) => {
    try {
      const download = await AppDataSource.getRepository(Download)
        .createQueryBuilder("download")
        .addSelect("download.storagePath")
        .where("download.id = :id", { id: req.params.id })
        .getOne();
      if (!download) throw new ApiError(404, "Download not found");
      const admin =
        req.user.userRole === "su" ||
        req.user.permissions?.some(
          (p) =>
            p.resource === "product" && ["create", "update"].includes(p.action),
        );
      if (!admin) {
        const purchased = await AppDataSource.getRepository(Order)
          .createQueryBuilder("order")
          .innerJoin("order.items", "item")
          .innerJoin(Product, "product", "product.id = item.productId")
          .innerJoin("product.downloads", "download", "download.id = :id", {
            id: download.id,
          })
          .where("order.userId = :userId AND order.paymentStatus = :status", {
            userId: req.user.id,
            status: PaymentStatus.COMPLETED,
          })
          .getCount();
        if (!purchased) throw new ApiError(403, "A paid purchase is required");
      }
      if (!download.storagePath) {
        res.redirect(download.url);
        return;
      }
      res.download(
        path.join(DOWNLOAD_DIR, path.basename(download.storagePath)),
        download.name,
        { dotfiles: "allow" },
        (error) => {
          if (error && !res.headersSent)
            res.status(404).json({ message: "File not found" });
        },
      );
    } catch (error) {
      respondError(res, error);
    }
  },
  remove: async (req: Request, res: Response) => {
    try {
      const result = await AppDataSource.getRepository(Download).delete(
        req.params.id,
      );
      if (!result.affected) throw new ApiError(404, "Download not found");
      // Keep physical files for recovery; they are never publicly served.
      res.status(204).send();
    } catch (error) {
      respondError(res, error);
    }
  },
};
