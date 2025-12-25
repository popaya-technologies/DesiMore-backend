import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Wishlist } from "../entities/wishlist.entity";
import { WishlistItem } from "../entities/wishlist-item.entity";
import { Product } from "../entities/product.entity";
import { Cart, CartType } from "../entities/cart.entity";
import { CartItem } from "../entities/cart-item.entity";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { AddToWishlistDto } from "../dto/wishlist.dto";

const wishlistRepository = AppDataSource.getRepository(Wishlist);
const wishlistItemRepository = AppDataSource.getRepository(WishlistItem);
const productRepository = AppDataSource.getRepository(Product);
const cartRepository = AppDataSource.getRepository(Cart);
const cartItemRepository = AppDataSource.getRepository(CartItem);

export const WishlistController = {
  // Get user's wishlist
  getWishlist: async (req: Request, res: Response) => {
    try {
      const userId = req.user.id;

      let wishlist = await wishlistRepository.findOne({
        where: { userId },
        relations: ["items", "items.product"],
      });

      if (!wishlist) {
        wishlist = wishlistRepository.create({ userId, items: [] });
        await wishlistRepository.save(wishlist);
      }

      res.status(200).json(wishlist);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Add a product to wishlist using route param :item (productId)
  addItemByParam: async (req: Request, res: Response) => {
    try {
      const userId = req.user.id;
      const dto = plainToInstance(AddToWishlistDto, { productId: req.params.item });

      const errors = await validate(dto, {
        whitelist: true,
        forbidUnknownValues: true,
        validationError: { target: false },
      });
      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      // Find or create wishlist
      let wishlist = await wishlistRepository.findOne({
        where: { userId },
        relations: ["items", "items.product"],
      });

      if (!wishlist) {
        wishlist = wishlistRepository.create({ userId, items: [] });
        await wishlistRepository.save(wishlist);
      }

      // Check product exists
      const product = await productRepository.findOne({
        where: { id: dto.productId },
      });
      if (!product) {
        res.status(404).json({ message: "Product not found" });
        return;
      }

      // Prevent duplicates
      const exists = wishlist.items?.some((i) => i.productId === dto.productId);
      if (exists) {
        res.status(200).json(wishlist);
        return;
      }

      const newItem = wishlistItemRepository.create({
        wishlistId: wishlist.id,
        productId: dto.productId,
        product,
      });
      await wishlistItemRepository.save(newItem);

      // Return updated wishlist
      const updated = await wishlistRepository.findOne({
        where: { id: wishlist.id },
        relations: ["items", "items.product"],
      });

      res.status(200).json(updated);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Remove an item from wishlist
  removeItem: async (req: Request, res: Response) => {
    try {
      const userId = req.user.id;
      const { itemId } = req.params;

      const wishlist = await wishlistRepository.findOne({
        where: { userId },
        relations: ["items"],
      });

      if (!wishlist) {
        res.status(404).json({ message: "Wishlist not found" });
        return;
      }

      const itemExists = wishlist.items?.some((i) => i.id === itemId);
      if (!itemExists) {
        res.status(404).json({ message: "Item not found in wishlist" });
        return;
      }

      await wishlistItemRepository.delete(itemId);

      const updated = await wishlistRepository.findOne({
        where: { id: wishlist.id },
        relations: ["items", "items.product"],
      });

      res.status(200).json(updated);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Clear wishlist
  clearWishlist: async (req: Request, res: Response) => {
    try {
      const userId = req.user.id;

      const wishlist = await wishlistRepository.findOne({
        where: { userId },
        relations: ["items"],
      });

      if (!wishlist) {
        res.status(404).json({ message: "Wishlist not found" });
        return;
      }

      await wishlistItemRepository.delete({ wishlistId: wishlist.id });

      const updated = await wishlistRepository.findOne({
        where: { id: wishlist.id },
        relations: ["items", "items.product"],
      });

      res.status(200).json(updated);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Move wishlist item to cart (adds quantity 1 and removes from wishlist)
  moveItemToCart: async (req: Request, res: Response) => {
    try {
      const userId = req.user.id;
      const { itemId } = req.params;

      // Load wishlist + items
      const wishlist = await wishlistRepository.findOne({
        where: { userId },
        relations: ["items", "items.product"],
      });

      if (!wishlist) {
        res.status(404).json({ message: "Wishlist not found" });
        return;
      }

      const wItem = wishlist.items?.find((i) => i.id === itemId);
      if (!wItem) {
        res.status(404).json({ message: "Item not found in wishlist" });
        return;
      }

      // Ensure product exists and is in stock
      const product = wItem.product || (await productRepository.findOne({ where: { id: wItem.productId } }));
      if (!product) {
        res.status(404).json({ message: "Product not found" });
        return;
      }

      if (!product.inStock) {
        res.status(400).json({ message: "Product is out of stock" });
        return;
      }

      const availableQuantity =
        typeof product.quantity === "string" ? parseInt(product.quantity) || 0 : (product.quantity as any) || 0;
      if (availableQuantity < 1) {
        res.status(400).json({ message: "Insufficient quantity", availableQuantity });
        return;
      }

      // Get or create cart
      let cart = await cartRepository.findOne({
        where: { userId, type: CartType.REGULAR },
        relations: ["items", "items.product"],
      });
      if (!cart) {
        cart = cartRepository.create({ userId, type: CartType.REGULAR, items: [] });
        cart = await cartRepository.save(cart);
        cart.items = [];
      }

      // Determine price from product
      const productPrice =
        typeof product.discountPrice === "string"
          ? parseFloat(product.discountPrice) || 0
          : typeof product.discountPrice === "number"
          ? product.discountPrice
          : typeof product.price === "string"
          ? parseFloat(product.price) || 0
          : (product.price as any) || 0;
      if (!productPrice || productPrice <= 0) {
        res.status(400).json({ message: "Invalid product price" });
        return;
      }

      // Add or increment in cart
      const existingItem = cart.items?.find((ci) => ci.productId === wItem.productId);
      if (existingItem) {
        existingItem.updateQuantity(existingItem.quantity + 1, productPrice);
        await cartItemRepository.save(existingItem);
      } else {
        const newCartItem = cartItemRepository.create({
          cartId: cart.id,
          productId: wItem.productId,
          quantity: 1,
          price: productPrice,
          product,
        });
        await cartItemRepository.save(newCartItem);
        cart.items = [...(cart.items || []), newCartItem];
      }

      // Recalculate and save cart
      cart.calculateTotal();
      await cartRepository.save(cart);

      // Remove from wishlist
      await wishlistItemRepository.delete(wItem.id);

      // Return updated resources
      const updatedCart = await cartRepository.findOne({ where: { id: cart.id }, relations: ["items", "items.product"] });
      const updatedWishlist = await wishlistRepository.findOne({ where: { id: wishlist.id }, relations: ["items", "items.product"] });

      res.status(200).json({ cart: updatedCart, wishlist: updatedWishlist });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
};
