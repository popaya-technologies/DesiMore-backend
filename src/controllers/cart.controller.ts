import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Cart, CartType } from "../entities/cart.entity";
import { CartItem } from "../entities/cart-item.entity";
import { Product } from "../entities/product.entity";
import { AddToCartDto, UpdateCartItemDto } from "../dto/cart.dto";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";

const cartRepository = AppDataSource.getRepository(Cart);
const cartItemRepository = AppDataSource.getRepository(CartItem);
const productRepository = AppDataSource.getRepository(Product);

const CART_RELATIONS = ["items", "items.product"] as const;

const parseCartType = (value?: string): CartType =>
  value === CartType.BUY_NOW ? CartType.BUY_NOW : CartType.REGULAR;

const findCart = async (userId: string, type: CartType) => {
  return cartRepository.findOne({
    where: { userId, type },
    relations: [...CART_RELATIONS],
  });
};

const ensureCart = async (userId: string, type: CartType) => {
  let cart = await findCart(userId, type);
  if (!cart) {
    cart = cartRepository.create({ userId, type, items: [] });
    cart = await cartRepository.save(cart);
    cart.items = [];
  }
  return cart;
};

const toNumber = (value?: string | number | null) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return isNaN(value) ? null : value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
};

const resolveProductPrice = (product: Product) => {
  const discountPrice = toNumber(product.discountPrice);
  const regularPrice = toNumber(product.price);
  return discountPrice ?? regularPrice ?? 0;
};

const calcFreight = (amount: number) => {
  if (amount >= 3500) return 0;
  if (amount >= 3000) return 75;
  if (amount >= 2500) return 95;
  if (amount >= 1500) return 125;
  if (amount >= 1200) return 150;
  if (amount >= 1) return 199;
  return 0;
};

const buildWholesaleSummary = (items: CartItem[]) => {
  const subtotal = items.reduce((sum, item) => {
    const qty = item.quantity || 0;
    const wholesalePrice = toNumber(item.product?.wholesalePrice) ?? 0;
    return sum + wholesalePrice * qty;
  }, 0);

  const discount = Number((subtotal * 0.02).toFixed(2)); // 2% mandatory
  const discountedSubtotal = Math.max(subtotal - discount, 0);
  const shipping = calcFreight(discountedSubtotal);
  const tax = 0;
  const total = Number((discountedSubtotal + shipping + tax).toFixed(2));

  return { subtotal, discount, shipping, tax, total };
};

const withWholesaleSummary = (cart: Cart | null) => {
  if (!cart) return cart;
  // Prefer persisted wholesale fields if present
  const summary = {
    subtotal: toNumber(cart.wholesaleSubtotal) ?? 0,
    discount: toNumber(cart.wholesaleDiscount) ?? 0,
    shipping: toNumber(cart.wholesaleShipping) ?? 0,
    tax: 0,
    total: toNumber(cart.wholesaleTotal) ?? 0,
  };
  return Object.assign({}, cart, { wholesaleSummary: summary });
};

export const CartController = {
  // Get user's cart
  getCart: async (req: Request, res: Response) => {
    try {
      const userId = req.user.id;
      const cartType = parseCartType(req.query.type as string);

      const cart = await ensureCart(userId, cartType);

      cart.calculateTotal();
      await cartRepository.save(cart);

      res.status(200).json(withWholesaleSummary(cart));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Add item to cart
  addToCart: async (req: Request, res: Response) => {
    try {
      const userId = req.user.id;
      const addToCartDto = plainToInstance(AddToCartDto, req.body);

      const errors = await validate(addToCartDto, {
        whitelist: true,
        forbidUnknownValues: true,
        validationError: { target: false },
      });
      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      // Find or create cart
      let cart = await ensureCart(userId, CartType.REGULAR);

      // Check if product exists
      const product = await productRepository.findOne({
        where: { id: addToCartDto.productId },
      });

      if (!product) {
        res.status(404).json({ message: "Product not found" });
        return;
      }

      // Check if product is in stock
      if (!product.inStock) {
        res.status(400).json({
          message: "Product is out of stock",
        });
        return;
      }

      // Handle product quantity (could be string or number)
      const availableQuantity =
        typeof product.quantity === "string"
          ? parseInt(product.quantity) || 0
          : product.quantity || 0;
      if (availableQuantity < addToCartDto.quantity) {
        res.status(400).json({
          message: "Insufficient quantity",
          availableQuantity: availableQuantity,
        });
        return;
      }

      // Handle product price (now a number from decimal column)
      const productPrice = resolveProductPrice(product);
      if (!productPrice || productPrice <= 0) {
        res.status(400).json({ message: "Invalid product price" });
        return;
      }

      // Check if item already in cart
      const existingItem = cart.items.find(
        (item) => item.productId === addToCartDto.productId
      );

      if (existingItem) {
        // Update quantity if item exists
        const newQuantity = existingItem.quantity + addToCartDto.quantity;
        existingItem.updateQuantity(newQuantity, productPrice);
        await cartItemRepository.save(existingItem);
      } else {
        // Add new item
        const newItem = cartItemRepository.create({
          cartId: cart.id,
          productId: addToCartDto.productId,
          quantity: addToCartDto.quantity,
          price: productPrice,
          product: product,
        });
        cart.items.push(newItem);
        await cartItemRepository.save(newItem);
      }

      // Recalculate cart total
      cart.calculateTotal();
      await cartRepository.save(cart);

      //  updated cart
      const updatedCart = await cartRepository.findOne({
        where: { id: cart.id },
        relations: ["items", "items.product"],
      });

      res.status(200).json(withWholesaleSummary(updatedCart ?? cart));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  createBuyNowCart: async (req: Request, res: Response) => {
    try {
      const userId = req.user.id;
      const dto = plainToInstance(AddToCartDto, req.body);

      const errors = await validate(dto, {
        whitelist: true,
        forbidUnknownValues: true,
        validationError: { target: false },
      });
      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      const product = await productRepository.findOne({
        where: { id: dto.productId },
      });

      if (!product) {
        res.status(404).json({ message: "Product not found" });
        return;
      }

      if (!product.inStock) {
        res.status(400).json({ message: "Product is out of stock" });
        return;
      }

      const availableQuantity =
        typeof product.quantity === "string"
          ? parseInt(product.quantity) || 0
          : product.quantity || 0;
      if (availableQuantity < dto.quantity) {
        res.status(400).json({
          message: "Insufficient quantity",
          availableQuantity,
        });
        return;
      }

      let cart = await ensureCart(userId, CartType.BUY_NOW);

      await cartItemRepository.delete({ cartId: cart.id });
      cart.items = [];

      const productPrice = resolveProductPrice(product);
      if (!productPrice || productPrice <= 0) {
        res.status(400).json({ message: "Invalid product price" });
        return;
      }

      const newItem = cartItemRepository.create({
        cartId: cart.id,
        productId: dto.productId,
        quantity: dto.quantity,
        price: productPrice,
        product,
      });

      await cartItemRepository.save(newItem);
      cart.items = [newItem];
      cart.calculateTotal();
      await cartRepository.save(cart);

      const updatedCart = await cartRepository.findOne({
        where: { id: cart.id },
        relations: [...CART_RELATIONS],
      });

      res.status(200).json(updatedCart ?? cart);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Update cart item quantity
  updateCartItem: async (req: Request, res: Response) => {
    try {
      const userId = req.user.id;
      const { itemId } = req.params;
      const updateDto = plainToInstance(UpdateCartItemDto, req.body);

      const errors = await validate(updateDto, {
        whitelist: true,
        forbidUnknownValues: true,
        validationError: { target: false },
      });
      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      // Find cart and item
      const cart = await findCart(userId, CartType.REGULAR);

      if (!cart) {
        res.status(404).json({ message: "Cart not found" });
        return;
      }

      const cartItem = cart.items.find((item) => item.id === itemId);
      if (!cartItem) {
        res.status(404).json({ message: "Item not found in cart" });
        return;
      }

      if (updateDto.quantity === 0) {
        // Remove item if quantity is 0
        await cartItemRepository.delete(itemId);
        cart.items = cart.items.filter((item) => item.id !== itemId);
      } else {
        // Check product availability
        const product = await productRepository.findOne({
          where: { id: cartItem.productId },
        });

        if (product && !product.inStock) {
          res.status(400).json({
            message: "Product is out of stock",
          });
          return;
        }

        // Handle available quantity
        const availableQuantity =
          typeof product?.quantity === "string"
            ? parseInt(product.quantity) || 0
            : product?.quantity || 0;
        if (updateDto.quantity > availableQuantity) {
          res.status(400).json({
            message: "Insufficient quantity",
            availableQuantity: availableQuantity,
          });
          return;
        }

        // Update quantity
        cartItem.updateQuantity(updateDto.quantity, cartItem.price);
        await cartItemRepository.save(cartItem);
      }

      // Recalculate cart total
      cart.calculateTotal();
      await cartRepository.save(cart);

      res.status(200).json(withWholesaleSummary(cart));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Remove item from cart
  removeCartItem: async (req: Request, res: Response) => {
    try {
      const userId = req.user.id;
      const { itemId } = req.params;

      const cart = await findCart(userId, CartType.REGULAR);

      if (!cart) {
        res.status(404).json({ message: "Cart not found" });
        return;
      }

      // Check if item exists in cart
      const itemExists = cart.items.some((item) => item.id === itemId);
      if (!itemExists) {
        res.status(404).json({ message: "Item not found in cart" });
        return;
      }

      // Remove item
      await cartItemRepository.delete(itemId);

      // Update in-memory items and recalculate totals
      cart.items = cart.items.filter((item) => item.id !== itemId);
      cart.calculateTotal();
      await cartRepository.save(cart);

      res.status(200).json(withWholesaleSummary(cart));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Clear entire cart
  clearCart: async (req: Request, res: Response) => {
    try {
      const userId = req.user.id;

      const cartType = parseCartType(req.query.type as string);

      const cart = await cartRepository.findOne({
        where: { userId, type: cartType },
        relations: ["items"],
      });

      if (!cart) {
        res.status(404).json({ message: "Cart not found" });
        return;
      }

      // Remove all items
      await cartItemRepository.delete({ cartId: cart.id });

      // Reset cart items and totals
      cart.items = [];
      cart.total = 0;
      cart.wholesaleTotal = 0;
      cart.wholesaleSubtotal = 0;
      cart.wholesaleDiscount = 0;
      cart.wholesaleShipping = 0;
      cart.itemsCount = 0;
      await cartRepository.save(cart);

      res.status(200).json(withWholesaleSummary(cart));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
};
