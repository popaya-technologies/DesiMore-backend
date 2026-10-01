import { Request, Response } from "express";
import { validate } from "class-validator";
import { AppDataSource } from "../data-source";
import { Store } from "../entities/store.entity";
import {
  CreateStoreDto,
  UpdateStoreDto,
} from "../dto/store.dto";
import { ILike } from "typeorm";
import { respondError } from "../utils/api-error";

const storeRepository = AppDataSource.getRepository(Store);

export const StoreController = {
  // Create Store
  createStore: async (req: Request, res: Response) => {
    try {
      const storeData = new CreateStoreDto();

      Object.assign(storeData, req.body);

      const errors = await validate(storeData, {
        whitelist: true,
        forbidUnknownValues: true,
        validationError: {
          target: false,
        },
      });

      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      // Keep only one default store
      if (storeData.isDefault === true) {
        await storeRepository.update(
          { isDefault: true },
          { isDefault: false },
        );
      }

      const store = storeRepository.create({
        metaTitle: storeData.metaTitle?.trim() ?? "",
        metaTagDescription:
          storeData.metaTagDescription?.trim() ?? "",
        metaTagKeywords:
          storeData.metaTagKeywords?.trim() ?? "",

        name: storeData.name.trim(),
        storeOwner: storeData.storeOwner.trim(),
        address: storeData.address.trim(),
        geocode: storeData.geocode?.trim() ?? "",
        email: storeData.email.trim(),
        telephone: storeData.telephone.trim(),
        fax: storeData.fax?.trim() ?? "",
        image: storeData.image?.trim() ?? "",
        openingTimes: storeData.openingTimes?.trim() ?? "",
        comment: storeData.comment?.trim() ?? "",

        country: storeData.country?.trim() || "United States",
        regionState:
          storeData.regionState?.trim() || "New Jersey",
        language: storeData.language?.trim() || "English",
        currency:
          storeData.currency?.trim() || "US Dollar",

        displayPricesWithTax:
          storeData.displayPricesWithTax ?? false,
        useStoreTaxAddress:
          storeData.useStoreTaxAddress?.trim() ?? "",
        useCustomerTaxAddress:
          storeData.useCustomerTaxAddress?.trim() ?? "",

        customerGroup:
          storeData.customerGroup?.trim() || "Default",
        customerGroups:
          storeData.customerGroups ?? ["Default"],
        accountTerms:
          storeData.accountTerms?.trim() ?? "",

        displayWeightOnCartPage:
          storeData.displayWeightOnCartPage ?? false,
        guestCheckout:
          storeData.guestCheckout ?? false,
        checkoutTerms:
          storeData.checkoutTerms?.trim() ?? "",
        orderStatus:
          storeData.orderStatus?.trim() || "Canceled",

        displayStock:
          storeData.displayStock ?? false,
        stockCheckout:
          storeData.stockCheckout ?? false,

        storeLogo:
          storeData.storeLogo?.trim() ?? "",
        icon:
          storeData.icon?.trim() ?? "",

        url: storeData.url.trim(),
        useSsl: storeData.useSsl ?? false,

        isDefault: storeData.isDefault ?? false,
      });

      await storeRepository.save(store);

      res.status(201).json(store);
    } catch (error) {
      respondError(res, error);
    }
  },

  // Get Stores
  getStores: async (req: Request, res: Response) => {
    try {
      const {
        name,
        url,
        page = "1",
        limit = "10",
      } = req.query;

      const currentPage = Math.max(
        parseInt(page as string, 10) || 1,
        1,
      );

      const take = Math.min(
        Math.max(
          parseInt(limit as string, 10) || 10,
          1,
        ),
        100,
      );

      const skip = (currentPage - 1) * take;

      const where: Record<string, unknown>[] = [];

      if (name) {
        where.push({
          name: ILike(`%${String(name).trim()}%`),
        });
      }

      if (url) {
        where.push({
          url: ILike(`%${String(url).trim()}%`),
        });
      }

      let stores: Store[];
      let total: number;

      if (where.length > 0) {
        const result = await storeRepository.findAndCount({
          where,
          order: {
            isDefault: "DESC",
            createdAt: "DESC",
          },
          skip,
          take,
        });

        stores = result[0];
        total = result[1];
      } else {
        const result = await storeRepository.findAndCount({
          order: {
            isDefault: "DESC",
            createdAt: "DESC",
          },
          skip,
          take,
        });

        stores = result[0];
        total = result[1];
      }

      const totalPages = Math.max(
        Math.ceil(total / take),
        1,
      );

      res.json({
        data: stores,
        meta: {
          total,
          page: currentPage,
          limit: take,
          totalPages,
        },
      });
    } catch (error) {
      respondError(res, error);
    }
  },

  // Get Store By ID
  getStoreById: async (req: Request, res: Response) => {
    try {
      const store = await storeRepository.findOne({
        where: {
          id: req.params.id,
        },
      });

      if (!store) {
        res.status(404).json({
          message: "Store not found",
        });
        return;
      }

      res.json(store);
    } catch (error) {
      respondError(res, error);
    }
  },

  // Update Store
  updateStore: async (req: Request, res: Response) => {
    try {
      const store = await storeRepository.findOne({
        where: {
          id: req.params.id,
        },
      });

      if (!store) {
        res.status(404).json({
          message: "Store not found",
        });
        return;
      }

      const storeData = new UpdateStoreDto();

      Object.assign(storeData, req.body);

      const errors = await validate(storeData, {
        whitelist: true,
        forbidUnknownValues: true,
        validationError: {
          target: false,
        },
      });

      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      if (storeData.isDefault === true) {
        await storeRepository
          .createQueryBuilder()
          .update(Store)
          .set({ isDefault: false })
          .where("isDefault = :isDefault", {
            isDefault: true,
          })
          .andWhere("id != :id", {
            id: store.id,
          })
          .execute();
      }

      Object.assign(store, {
        ...storeData,

        metaTitle:
          storeData.metaTitle !== undefined
            ? storeData.metaTitle.trim()
            : store.metaTitle,

        metaTagDescription:
          storeData.metaTagDescription !== undefined
            ? storeData.metaTagDescription.trim()
            : store.metaTagDescription,

        metaTagKeywords:
          storeData.metaTagKeywords !== undefined
            ? storeData.metaTagKeywords.trim()
            : store.metaTagKeywords,

        name:
          storeData.name !== undefined
            ? storeData.name.trim()
            : store.name,

        storeOwner:
          storeData.storeOwner !== undefined
            ? storeData.storeOwner.trim()
            : store.storeOwner,

        address:
          storeData.address !== undefined
            ? storeData.address.trim()
            : store.address,

        geocode:
          storeData.geocode !== undefined
            ? storeData.geocode.trim()
            : store.geocode,

        email:
          storeData.email !== undefined
            ? storeData.email.trim()
            : store.email,

        telephone:
          storeData.telephone !== undefined
            ? storeData.telephone.trim()
            : store.telephone,

        fax:
          storeData.fax !== undefined
            ? storeData.fax.trim()
            : store.fax,

        image:
          storeData.image !== undefined
            ? storeData.image.trim()
            : store.image,

        openingTimes:
          storeData.openingTimes !== undefined
            ? storeData.openingTimes.trim()
            : store.openingTimes,

        comment:
          storeData.comment !== undefined
            ? storeData.comment.trim()
            : store.comment,

        country:
          storeData.country !== undefined
            ? storeData.country.trim()
            : store.country,

        regionState:
          storeData.regionState !== undefined
            ? storeData.regionState.trim()
            : store.regionState,

        language:
          storeData.language !== undefined
            ? storeData.language.trim()
            : store.language,

        currency:
          storeData.currency !== undefined
            ? storeData.currency.trim()
            : store.currency,

        useStoreTaxAddress:
          storeData.useStoreTaxAddress !== undefined
            ? storeData.useStoreTaxAddress.trim()
            : store.useStoreTaxAddress,

        useCustomerTaxAddress:
          storeData.useCustomerTaxAddress !== undefined
            ? storeData.useCustomerTaxAddress.trim()
            : store.useCustomerTaxAddress,

        customerGroup:
          storeData.customerGroup !== undefined
            ? storeData.customerGroup.trim()
            : store.customerGroup,

        accountTerms:
          storeData.accountTerms !== undefined
            ? storeData.accountTerms.trim()
            : store.accountTerms,

        checkoutTerms:
          storeData.checkoutTerms !== undefined
            ? storeData.checkoutTerms.trim()
            : store.checkoutTerms,

        orderStatus:
          storeData.orderStatus !== undefined
            ? storeData.orderStatus.trim()
            : store.orderStatus,

        storeLogo:
          storeData.storeLogo !== undefined
            ? storeData.storeLogo.trim()
            : store.storeLogo,

        icon:
          storeData.icon !== undefined
            ? storeData.icon.trim()
            : store.icon,

        url:
          storeData.url !== undefined
            ? storeData.url.trim()
            : store.url,
      });

      await storeRepository.save(store);

      res.json(store);
    } catch (error) {
      respondError(res, error);
    }
  },

  // Delete Store
  deleteStore: async (req: Request, res: Response) => {
    try {
      const store = await storeRepository.findOne({
        where: {
          id: req.params.id,
        },
      });

      if (!store) {
        res.status(404).json({
          message: "Store not found",
        });
        return;
      }

      await storeRepository.remove(store);

      res.json({
        message: "Store deleted successfully",
      });
    } catch (error) {
      respondError(res, error);
    }
  },
};