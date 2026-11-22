import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Product from "../models/Product.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Merchant: list/search/paginate own products
export const getProducts = async (req, res) => {
  try {
    const merchantId = req.merchantId || req.user?.id || req.user?._id;
    const { page = "1", limit = "15", search = "" } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 15));

    const filter = { merchantId };
    if (search.trim()) {
      const regex = new RegExp(
        search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );
      filter.$or = [{ name: regex }, { sku: regex }, { category: regex }];
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ updatedAt: -1, _id: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(filter),
    ]);

    return res.status(200).json({
      products,
      page: pageNum,
      totalPages: Math.max(1, Math.ceil(total / limitNum)),
      total,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: err.message || "Failed to fetch products" });
  }
};

// Merchant: update own product (enforces merchant ownership -> 403 if not owner)
export const updateProduct = async (req, res) => {
  try {
    const merchantId = String(req.merchantId || req.user?.id || req.user?._id);
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (String(product.merchantId) !== merchantId) {
      return res
        .status(403)
        .json({ message: "Forbidden: you do not own this product" });
    }

    if (req.body.name !== undefined) {
      product.name = String(req.body.name).trim();
    }
    if (req.body.category !== undefined) {
      product.category = String(req.body.category).trim();
    }
    if (req.body.price !== undefined) {
      const priceNum = Number(req.body.price);
      if (Number.isNaN(priceNum) || priceNum < 0) {
        return res
          .status(400)
          .json({ message: "Price must be a non-negative number" });
      }
      product.price = priceNum;
    }
    if (req.body.stock !== undefined) {
      const stockNum = Number(req.body.stock);
      if (!Number.isInteger(stockNum) || stockNum < 0) {
        return res
          .status(400)
          .json({ message: "Stock must be a non-negative whole number" });
      }
      product.stock = stockNum;
    }

    if (req.file) {
      if (product.imageUrl) {
        const oldFile = path.join(__dirname, "..", product.imageUrl);
        fs.unlink(oldFile, () => {});
      }
      product.imageUrl = `/uploads/${req.file.filename}`;
    }

    await product.save();
    return res.status(200).json(product);
  } catch (err) {
    return res
      .status(500)
      .json({ message: err.message || "Failed to update product" });
  }
};

// Merchant: delete own product (enforces merchant ownership -> 403 if not owner)
export const deleteProduct = async (req, res) => {
  try {
    const merchantId = String(req.merchantId || req.user?.id || req.user?._id);
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (String(product.merchantId) !== merchantId) {
      return res
        .status(403)
        .json({ message: "Forbidden: you do not own this product" });
    }

    if (product.imageUrl) {
      const filePath = path.join(__dirname, "..", product.imageUrl);
      fs.unlink(filePath, () => {});
    }

    await product.deleteOne();
    return res.status(200).json({ message: "Product deleted successfully" });
  } catch (err) {
    return res
      .status(500)
      .json({ message: err.message || "Failed to delete product" });
  }
};

// Public catalogue endpoint for customers (returns all merchants' products with merchant name)
export const getPublicProducts = async (req, res) => {
  try {
    const { category = "", search = "", page = "1", limit = "20" } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const filter = {};
    if (category.trim() && category.trim().toLowerCase() !== "all") {
      filter.category = new RegExp(
        `^${category.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        "i"
      );
    }

    if (search.trim()) {
      const regex = new RegExp(
        search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );
      filter.$or = [{ name: regex }, { sku: regex }, { category: regex }];
    }

    const [rawProducts, total, categories] = await Promise.all([
      Product.find(filter)
        .populate("merchantId", "name email")
        .select("sku name category subcategory price stock imageUrl merchantId updatedAt")
        .sort({ updatedAt: -1, _id: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(filter),
      Product.distinct("category"),
    ]);

    const products = rawProducts.map((item) => ({
      ...item,
      merchantName: item.merchantId?.name || "Aroma Merchant",
      merchantEmail: item.merchantId?.email || "",
      merchantId: item.merchantId?._id || item.merchantId,
    }));

    return res.status(200).json({
      products,
      categories: categories.filter(Boolean).sort((a, b) => a.localeCompare(b)),
      page: pageNum,
      totalPages: Math.max(1, Math.ceil(total / limitNum)),
      total,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: err.message || "Failed to load customer catalogue" });
  }
};

// Public customer order endpoint: atomically decrements stock in MongoDB
export const orderProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const qty = Number(req.body?.quantity ?? 1);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }
    if (!Number.isInteger(qty) || qty < 1) {
      return res
        .status(400)
        .json({ message: "Quantity must be a whole number of at least 1" });
    }

    const updatedProduct = await Product.findOneAndUpdate(
      { _id: id, stock: { $gte: qty } },
      { $inc: { stock: -qty } },
      { new: true }
    ).lean();

    if (!updatedProduct) {
      const exists = await Product.findById(id).lean();
      if (!exists) {
        return res.status(404).json({ message: "Product not found" });
      }
      return res.status(400).json({
        message: `Insufficient stock. Only ${exists.stock} unit(s) available.`,
      });
    }

    return res.status(200).json({
      message: `Order placed for ${qty} × ${updatedProduct.name}`,
      order: {
        productId: updatedProduct._id,
        sku: updatedProduct.sku,
        name: updatedProduct.name,
        category: updatedProduct.category,
        unitPrice: Number(updatedProduct.price),
        quantity: qty,
        totalAmount: Number((Number(updatedProduct.price) * qty).toFixed(2)),
        remainingStock: updatedProduct.stock,
        orderedAt: new Date().toISOString(),
      },
      product: updatedProduct,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: err.message || "Failed to place order" });
  }
};