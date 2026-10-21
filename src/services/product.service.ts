import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { EntityManager, In } from "typeorm";
import { randomUUID } from "crypto";
import sanitizeHtml from "sanitize-html";
import { AppDataSource } from "../data-source";
import { Product } from "../entities/product.entity";
import { Category } from "../entities/category.entity";
import { Brand } from "../entities/brand.entity";
import { Download } from "../entities/download.entity";
import { Attribute } from "../entities/attribute.entity";
import { ProductAttribute } from "../entities/product-attribute.entity";
import { ProductOption } from "../entities/product-option.entity";
import { CatalogOption } from "../entities/option.entity";
import { ProductDiscount } from "../entities/product-discount.entity";
import { ProductImage } from "../entities/product-image.entity";
import { SeoUrl } from "../entities/seo-url.entity";
import { CreateProductDto } from "../dto/product.dto";
import { ApiError } from "../utils/api-error";
import { StockStatus } from "../entities/stock-status.entity";
import { getDefaultSystemLanguage } from "./system-language.service";

export const PRODUCT_RELATIONS = [
  "categories",
  "brand",
  "attributes",
  "attributes.attribute",
  "attributes.attribute.attributeGroup",
  "options",
  "options.option",
  "discounts",
  "imageDetails",
  "downloads",
  "relatedProducts",
  "stockStatus",
];
const scalars = [
  "title",
  "model",
  "summary",
  "metaTitle",
  "sku",
  "mpn",
  "metaDescription",
  "metaKeyword",
  "tag",
  "price",
  "discountPrice",
  "wholesalePrice",
  "quantity",
  "unitsPerCarton",
  "wholesaleOrderQuantity",
  "weight",
  "length",
  "width",
  "height",
  "inStock",
  "isActive",
  "package",
  "minimumQuantity",
  "subtractStock",
  "outOfStockStatus",
  "stockStatusId",
  "requiresShipping",
  "dateAvailable",
  "lengthClass",
  "weightClass",
  "sortOrder",
  "wholesaleQuantity",
  "wholesaleMinimumQuantity",
  "wholesaleRequiresShipping",
  "wholesaleDateAvailable",
  "wholesaleLength",
  "wholesaleWidth",
  "wholesaleHeight",
  "wholesaleWeight",
  "wholesaleLengthClass",
  "wholesaleWeightClass",
] as const;
const DEFAULT_SEO_STORE = "Default";
const DEFAULT_SEO_LANGUAGE = "English";
const productSeoQuery = (id: string) => `product_id=${id}`;
export const seoKeywordFromTitle = (title: string) =>
  title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 500)
    .replace(/-+$/g, "") || "product";

const syncProductSeoUrl = async (
  manager: EntityManager,
  product: Product,
  requestedKeyword?: string,
) => {
  const repo = manager.getRepository(SeoUrl);
  const defaultLanguage = await getDefaultSystemLanguage(manager);
  const query = productSeoQuery(product.id);
  const existing = await repo.findOne({
    where: { query, store: DEFAULT_SEO_STORE, languageId: defaultLanguage.id },
  });
  let keyword = requestedKeyword?.trim() || existing?.keyword;
  if (!keyword) {
    const base = seoKeywordFromTitle(product.title);
    keyword = base;
    for (let suffix = 2; await repo.findOne({
      where: { keyword, store: DEFAULT_SEO_STORE, languageId: defaultLanguage.id },
    }); suffix++) keyword = `${base.slice(0, 490)}-${suffix}`;
  }
  const conflict = await repo.findOne({
    where: { keyword, store: DEFAULT_SEO_STORE, languageId: defaultLanguage.id },
  });
  if (conflict && conflict.id !== existing?.id)
    throw new ApiError(409, "This SEO keyword already exists for the default English store");
  try {
    return await repo.save(
      existing
        ? Object.assign(existing, {
            keyword,
            language: defaultLanguage.languageName,
            languageId: defaultLanguage.id,
            systemLanguage: defaultLanguage,
          })
        : repo.create({
            query,
            keyword,
            store: DEFAULT_SEO_STORE,
            language: defaultLanguage.languageName,
            languageId: defaultLanguage.id,
            systemLanguage: defaultLanguage,
          }),
    );
  } catch (error) {
    if ((error as any)?.code === "23505")
      throw new ApiError(409, "This product or SEO keyword already has an SEO URL");
    throw error;
  }
};

export const getProductSeoKeyword = async (productId: string) => {
  const defaultLanguage = await getDefaultSystemLanguage();
  return (
    await AppDataSource.getRepository(SeoUrl).findOne({
      where: {
        query: productSeoQuery(productId),
        store: DEFAULT_SEO_STORE,
        languageId: defaultLanguage.id,
      },
    })
  )?.keyword ?? null;
};

export const attachProductSeoKeywords = async <T extends { id: string }>(
  products: T[],
): Promise<Array<T & { seoKeyword: string | null }>> => {
  if (!products.length) return [];
  const defaultLanguage = await getDefaultSystemLanguage();
  const prefix = "product_id=";
  const rows = await AppDataSource.getRepository(SeoUrl).find({
    where: {
      query: In(products.map((product) => productSeoQuery(product.id))),
      store: DEFAULT_SEO_STORE,
      languageId: defaultLanguage.id,
    },
  });
  const byProductId = new Map(
    rows.map((row) => [row.query.slice(prefix.length), row.keyword]),
  );
  return products.map((product) => ({
    ...product,
    seoKeyword: byProductId.get(product.id) ?? null,
  }));
};

export const deleteProductWithSeo = async (id: string) =>
  AppDataSource.transaction(async (manager) => {
    const productRepo = manager.getRepository(Product);
    const product = await productRepo.findOne({ where: { id } });
    if (!product) throw new ApiError(404, "Product not found");
    const defaultLanguage = await getDefaultSystemLanguage(manager);
    await manager.getRepository(SeoUrl).delete({
      query: productSeoQuery(id),
      store: DEFAULT_SEO_STORE,
      languageId: defaultLanguage.id,
    });
    await productRepo.remove(product);
  });
export const cleanRichText = (value: string) =>
  sanitizeHtml(value, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "ul",
      "ol",
      "li",
      "blockquote",
      "a",
      "img",
      "h2",
      "h3",
      "h4",
      "span",
    ],
    allowedAttributes: {
      a: ["href", "title"],
      img: ["src", "alt", "width", "height"],
    },
    allowedSchemes: ["https", "http"],
    allowProtocolRelative: false,
  });
export const validateAssetUrl = (value: string) => {
  if (
    typeof value !== "string" ||
    value.length > 2048 ||
    /[\\\s\x00-\x1f]/.test(value)
  )
    throw new ApiError(400, "Invalid asset URL");
  if (
    /^\/(uploads|catalog)\//.test(value) &&
    !value.includes("..") &&
    !/%2e|%2f|%5c/i.test(value)
  )
    return;
  try {
    const url = new URL(value);
    if (
      ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
    )
      return;
  } catch {}
  throw new ApiError(
    400,
    "Asset URL must use HTTP(S) or a local /uploads/ or /catalog/ path",
  );
};
export const normalizeProductInput = (input: any) => {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new ApiError(400, "Product must be an object");
  const body = { ...input };
  for (const [alias, key] of Object.entries({
    productName: "title",
    description: "summary",
    manufacturerId: "brandId",
    boxQuantity: "unitsPerCarton",
  })) {
    if (body[alias] !== undefined) {
      if (body[key] !== undefined && body[key] !== body[alias])
        throw new ApiError(400, "Conflicting " + alias + " and " + key);
      body[key] = body[alias];
      delete body[alias];
    }
  }
  if (
    body.unitsPerCarton !== undefined &&
    body.wholesaleOrderQuantity !== undefined &&
    String(body.unitsPerCarton) !== String(body.wholesaleOrderQuantity)
  )
    throw new ApiError(400, "Box quantity aliases must agree");
  return body;
};
export const validateProductInput = async (input: any, creating: boolean) => {
  const body = normalizeProductInput(input);
  const dto = plainToInstance(CreateProductDto, body);
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
    validationError: { target: false, value: false },
  });
  if (errors.length) throw new ApiError(400, "Invalid product data", errors);
  if (creating)
    for (const field of [
      "title",
      "model",
      "metaTitle",
      "price",
      "quantity",
      "categoryIds",
    ]) {
      if (
        dto[field] === undefined ||
        dto[field] === null ||
        dto[field] === "" ||
        (field === "categoryIds" && !dto.categoryIds.length)
      )
        throw new ApiError(400, field + " is required");
    }
  if (!creating && !Object.keys(body).length)
    throw new ApiError(400, "At least one product field is required");
  if (dto.imageDetails !== undefined && dto.images !== undefined)
    throw new ApiError(400, "Send imageDetails or images, not both");
  if (
    dto.imageDetails?.length &&
    dto.imageDetails.filter((i) => i.isMain).length !== 1
  )
    throw new ApiError(400, "Choose exactly one main image");
  for (const image of dto.imageDetails || []) validateAssetUrl(image.url);
  for (const url of dto.images || []) validateAssetUrl(url);
  for (const discount of dto.discounts || [])
    if (
      discount.dateStart &&
      discount.dateEnd &&
      discount.dateEnd < discount.dateStart
    )
      throw new ApiError(400, "Discount end date must not precede start date");
  for (const option of dto.options || []) {
    const choice = ["checkbox", "select", "radio"].includes(option.type);
    if (choice && !option.values.length)
      throw new ApiError(400, "Choice options require values");
    if (!choice && option.values.length)
      throw new ApiError(
        400,
        "Text and date options cannot have choice values",
      );
    if (
      new Set(option.values.map((v) => v.optionValueId)).size !==
      option.values.length
    )
      throw new ApiError(400, "Duplicate option values");
  }
  if (
    dto.options &&
    new Set(dto.options.map((option) => option.optionId)).size !==
      dto.options.length
  )
    throw new ApiError(400, "Duplicate product options");
  if (
    dto.attributes &&
    new Set(dto.attributes.map((attribute) => attribute.attributeId)).size !==
      dto.attributes.length
  )
    throw new ApiError(400, "Duplicate product attributes");
  return dto;
};
export const productResponse = (product: Product, admin = false): any => {
  if (!product) return null;
  const {
    categories = [],
    brand,
    relatedProducts = [],
    downloads = [],
    ...data
  } = product;
  const orderedImages = [...(product.imageDetails || [])].sort(
    (a, b) =>
      Number(b.isMain) - Number(a.isMain) ||
      a.sortOrder - b.sortOrder ||
      a.id.localeCompare(b.id),
  );
  const result: any = {
    ...data,
    discountPrice: data.discountPrice ?? data.price,
    tag: data.tag ?? null,
    categoryIds: categories.map((c) => c.id),
    brandId: brand?.id ?? null,
    manufacturerId: brand?.id ?? null,
    boxQuantity: product.unitsPerCarton,
    relatedProductIds: relatedProducts.map((p) => p.id),
    downloadIds: downloads.map((d) => d.id),
    downloads: downloads.map((d) => (admin ? d : { id: d.id, name: d.name })),
  };
  if (product.imageDetails) {
    result.imageDetails = orderedImages;
    result.images = orderedImages.map((i) => i.url);
    result.mainImage = orderedImages.find((i) => i.isMain)?.url ?? null;
  } else result.mainImage = product.images?.[0] ?? null;
  if (result.attributes)
    result.attributes = result.attributes.map((row: ProductAttribute) => ({
      id: row.id,
      productId: row.productId,
      attributeId: row.attributeId,
      name: row.attribute?.name ?? row.name,
      text: row.text,
      sortOrder: row.sortOrder,
      attribute: row.attribute ?? null,
    }));
  if (result.options)
    result.options = result.options.map((row: ProductOption) => ({
      id: row.id,
      productId: row.productId,
      optionId: row.optionId,
      name: row.option?.name ?? row.name,
      type: row.option?.type ?? row.type,
      required: row.required,
      sortOrder: row.sortOrder,
      values: row.values,
      option: row.option ?? null,
    }));
  for (const key of ["attributes", "options"])
    if (result[key])
      result[key] = [...result[key]].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id),
      );
  return result;
};
const resolveIds = async (
  manager: EntityManager,
  entity: any,
  ids: string[],
  label: string,
): Promise<any[]> => {
  if (!ids.length) return [];
  const rows = await manager
    .getRepository(entity)
    .findBy({ id: In(ids) } as any);
  if (rows.length !== ids.length) throw new ApiError(400, "Invalid " + label);
  return rows;
};
const replaceRows = async (
  manager: EntityManager,
  entity: any,
  productId: string,
  rows: any[],
  transform: (row: any, index: number, existing?: any) => any,
) => {
  const repo = manager.getRepository(entity);
  const old: any[] = await repo.findBy({ productId } as any);
  const ids = rows.filter((r) => r.id).map((r) => r.id);
  if (
    new Set(ids).size !== ids.length ||
    ids.some((id) => !old.some((r) => r.id === id))
  )
    throw new ApiError(400, "Invalid or duplicate nested row ID");
  const keep = rows.map((row, i) => ({
    ...transform(
      row,
      i,
      old.find((r) => r.id === row.id),
    ),
    id: row.id || randomUUID(),
    productId,
  }));
  if (entity === ProductImage)
    await repo.update({ productId } as any, { isMain: false } as any);
  const removed = old.filter((r) => !ids.includes(r.id)).map((r) => r.id);
  if (removed.length) await repo.delete(removed);
  if (keep.length) await repo.save(keep);
};
export const saveProduct = async (
  input: any,
  id?: string,
  legacyImport = false,
) => {
  const dto = await validateProductInput(input, !id && !legacyImport);
  if (!id && (dto.title === undefined || dto.price === undefined))
    throw new ApiError(400, "title and price are required");
  return AppDataSource.transaction(async (manager) => {
    const repo = manager.getRepository(Product);
    let product = id
      ? await repo.findOne({
          where: { id },
          lock: { mode: "pessimistic_write" },
        })
      : repo.create({ summary: "", images: [], categories: [] });
    if (!product) throw new ApiError(404, "Product not found");
    for (const key of scalars)
      if (dto[key] !== undefined) (product as any)[key] = dto[key];
    if (dto.stockStatusId !== undefined) {
      product.stockStatus = (
        await resolveIds(manager, StockStatus, [dto.stockStatusId], "stockStatusId")
      )[0];
      product.stockStatusId = product.stockStatus.id;
    } else if (!id && !product.stockStatusId) {
      const statusRepository = manager.getRepository(StockStatus);
      product.stockStatus =
        (await statusRepository
          .createQueryBuilder("status")
          .where("LOWER(status.name) = LOWER(:name)", { name: "Out Of Stock" })
          .getOne()) ??
        (await statusRepository.findOne({ order: { name: "ASC" } }));
      if (!product.stockStatus) {
        throw new ApiError(400, "Create a stock status before creating products");
      }
      product.stockStatusId = product.stockStatus.id;
    }
    if (dto.summary !== undefined) product.summary = cleanRichText(dto.summary);
    if (dto.unitsPerCarton !== undefined)
      product.wholesaleOrderQuantity =
        dto.unitsPerCarton === null ? null : String(dto.unitsPerCarton);
    else if (dto.wholesaleOrderQuantity !== undefined)
      product.unitsPerCarton =
        dto.wholesaleOrderQuantity === null
          ? null
          : Number(dto.wholesaleOrderQuantity);
    if (dto.categoryIds !== undefined)
      product.categories = await resolveIds(
        manager,
        Category,
        dto.categoryIds,
        "categoryIds",
      );
    if (dto.brandId !== undefined)
      product.brand =
        dto.brandId === null
          ? null
          : (await resolveIds(manager, Brand, [dto.brandId], "brandId"))[0];
    if (dto.relatedProductIds !== undefined) {
      if (id && dto.relatedProductIds.includes(id))
        throw new ApiError(400, "Product cannot be related to itself");
      product.relatedProducts = await resolveIds(
        manager,
        Product,
        dto.relatedProductIds,
        "relatedProductIds",
      );
    }
    if (dto.downloadIds !== undefined)
      product.downloads = await resolveIds(
        manager,
        Download,
        dto.downloadIds,
        "downloadIds",
      );
    if (dto.package !== undefined) {
      for (const key of ["length", "width", "height"])
        product[key] = dto.package?.[key] ?? null;
    } else if (
      ["length", "width", "height"].some((key) => dto[key] !== undefined)
    ) {
      product.package = {
        length: product.length,
        width: product.width,
        height: product.height,
      };
    }
    await repo.save(product);
    const seoUrl = await syncProductSeoUrl(manager, product, dto.seoKeyword);
    if (dto.attributes !== undefined) {
      const masterAttributes = await resolveIds(
        manager,
        Attribute,
        dto.attributes.map((row) => row.attributeId),
        "attributeId",
      );
      const attributeById = new Map(
        masterAttributes.map((attribute) => [attribute.id, attribute]),
      );
      await replaceRows(
        manager,
        ProductAttribute,
        product.id,
        dto.attributes,
        (row, index) => ({
          attributeId: row.attributeId,
          name: attributeById.get(row.attributeId).name,
          text: cleanRichText(row.text),
          sortOrder: row.sortOrder ?? index,
        }),
      );
    }
    if (dto.discounts !== undefined)
      await replaceRows(
        manager,
        ProductDiscount,
        product.id,
        dto.discounts,
        (row) => ({
          ...row,
          dateStart: row.dateStart || null,
          dateEnd: row.dateEnd || null,
        }),
      );
    if (dto.options !== undefined) {
      const masterOptions = await resolveIds(
        manager,
        CatalogOption,
        dto.options.map((row) => row.optionId),
        "optionId",
      );
      const optionById = new Map<string, CatalogOption>(
        masterOptions.map((option) => [option.id, option]),
      );
      await replaceRows(
        manager,
        ProductOption,
        product.id,
        dto.options,
        (row, index, old) => {
          const master = optionById.get(row.optionId);
          if (!master) throw new ApiError(400, "Invalid optionId");
          if (row.type !== master.type)
            throw new ApiError(400, "Product option type does not match the master option");
          const choice = ["checkbox", "select", "radio"].includes(master.type);
          const masterValueById = new Map<string, CatalogOption["values"][number]>(
            (master.values || []).map((value) => [value.id, value]),
          );
          if (
            choice &&
            row.values.some(
              (value) =>
                !value.optionValueId || !masterValueById.has(value.optionValueId),
            )
          )
            throw new ApiError(400, "Invalid master option value");
          const oldIds = new Set((old?.values || []).map((v) => v.id));
          const incomingIds = row.values.filter((v) => v.id).map((v) => v.id);
          if (
            new Set(incomingIds).size !== incomingIds.length ||
            incomingIds.some((v) => !oldIds.has(v))
          )
            throw new ApiError(400, "Invalid or duplicate option value ID");
          return {
            optionId: master.id,
            name: master.name,
            type: master.type,
            required: row.required,
            sortOrder: row.sortOrder ?? index,
            values: row.values.map((v) => ({
              quantity: 0,
              subtractStock: true,
              pricePrefix: "+",
              price: 0,
              pointsPrefix: "+",
              points: 0,
              weightPrefix: "+",
              weight: 0,
              ...v,
              optionValueId: v.optionValueId || null,
              value: v.optionValueId
                ? masterValueById.get(v.optionValueId).name
                : v.value.trim(),
              id: v.id || randomUUID(),
            })),
          };
        },
      );
    }
    const images =
      dto.imageDetails ??
      dto.images?.map((url, i) => ({ url, isMain: i === 0, sortOrder: i }));
    if (images !== undefined) {
      if (new Set(images.map((i) => i.url)).size !== images.length)
        throw new ApiError(400, "Duplicate image URLs");
      await replaceRows(
        manager,
        ProductImage,
        product.id,
        images,
        (row) => row,
      );
      product.images = [...images]
        .sort(
          (a, b) =>
            Number(b.isMain) - Number(a.isMain) || a.sortOrder - b.sortOrder,
        )
        .map((i) => i.url);
      await repo.save(product);
    }
    const response = productResponse(
      await repo.findOne({
        where: { id: product.id },
        relations: PRODUCT_RELATIONS,
      }),
      true,
    );
    response.seoKeyword = seoUrl.keyword;
    return response;
  });
};
