import mongoose from "mongoose";
import Product from "../models/Product.js";

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const getProducts = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 15));
    const search = (req.query.search || "").trim();

    const filter = { merchantId: req.merchantId };
    if (search) {
      const safeSearch = escapeRegex(search);
      filter.$or = [
        { sku: { $regex: safeSearch,$options: "i" } },
        { name: { $regex: safeSearch,$options: "i" } },
      ];
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ updatedAt: -1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Product.countDocuments(filter),
    ]);

    return res.json({
      products,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to load products", error: err.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const existing = await Product.findById(id);
    if (!existing) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Enforce merchant ownership on the server
    if (String(existing.merchantId) !== String(req.merchantId)) {
      return res.status(403).json({ message: "Forbidden: Cannot modify another merchant product" });
    }

    const body = req.body || {};
    const updates = {};

    if (body.name !== undefined) {
      const trimmedName = String(body.name).trim();
      if (!trimmedName) {
        return res.status(400).json({ message: "Product name cannot be empty" });
      }
      updates.name = trimmedName;
    }

    if (body.category !== undefined) {
      const trimmedCategory = String(body.category).trim();
      if (!trimmedCategory) {
        return res.status(400).json({ message: "Category cannot be empty" });
      }
      updates.category = trimmedCategory;
    }

    if (body.price !== undefined) {
      const parsedPrice = Number(body.price);
      if (String(body.price).trim() === "" || Number.isNaN(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({ message: "Price must be a non-negative number" });
      }
      updates.price = parsedPrice;
    }

    if (body.stock !== undefined) {
      const rawStock = String(body.stock).trim();
      const parsedStock = Number(rawStock);
      if (rawStock === "" || !Number.isInteger(parsedStock) || parsedStock < 0) {
        return res.status(400).json({ message: "Stock must be a non-negative whole number" });
      }
      updates.stock = parsedStock;
    }

    if (req.file) {
      updates.imageUrl = `/uploads/${req.file.filename}`;
    }

    const updated = await Product.findOneAndUpdate(
      { _id: id, merchantId: existing.merchantId },
      { $set: updates },
      { returnDocument: "after", runValidators: true }
    );

    return res.json(updated);
  } catch (err) {
    console.error("updateProduct error:", err);
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message || "Failed to update product" });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const existing = await Product.findById(id);
    if (!existing) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Enforce merchant ownership on the server
    if (String(existing.merchantId) !== String(req.merchantId)) {
      return res.status(403).json({ message: "Forbidden: Cannot delete another merchant product" });
    }

    await Product.findOneAndDelete({ _id: id, merchantId: existing.merchantId });

    return res.json({ message: "Product deleted successfully", id });
  } catch (err) {
    console.error("deleteProduct error:", err);
    return res.status(500).json({ message: err.message || "Failed to delete product" });
  }
};