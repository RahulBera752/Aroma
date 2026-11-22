import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
      index: true,
    },

    sku: {
      type: String,
      required: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    stock: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Stock must be a whole number",
      },
    },

    imageUrl: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Same SKU is allowed for different merchants.
productSchema.index(
  { merchantId: 1, sku: 1 },
  { unique: true }
);

const Product = mongoose.model("Product", productSchema);

export default Product;