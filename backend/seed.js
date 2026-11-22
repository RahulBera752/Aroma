import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import dns from "node:dns";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import connectDB from "./config/db.js";
import Merchant from "./models/Merchant.js";
import Product from "./models/Product.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, ".env") });
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const seed = async () => {
  try {
    await connectDB();

    const demoEmails = ["merchantA@aroma.co", "merchantB@aroma.co"];
    await Merchant.deleteMany({ email: { $in: demoEmails } });

    const passwordHash = await bcrypt.hash("password123", 10);

    const [merchantA, merchantB] = await Merchant.create([
      {
        name: "Aroma Storefront A",
        email: "merchantA@aroma.co",
        password: passwordHash,
      },
      {
        name: "Aroma Storefront B",
        email: "merchantB@aroma.co",
        password: passwordHash,
      },
    ]);

    await Product.deleteMany({
      merchantId: { $in: [merchantA._id, merchantB._id] },
    });

    const merchantAProducts = [
      {
        merchantId: merchantA._id,
        sku: "SHARED-001",
        name: "Merchant A Sandalwood Elixir",
        category: "Essential Oils",
        price: 699,
        stock: 25,
      },
      {
        merchantId: merchantA._id,
        sku: "A-CANDLE-102",
        name: "Merchant A Midnight Amber Candle",
        category: "Candles",
        price: 849,
        stock: 18,
      },
      {
        merchantId: merchantA._id,
        sku: "A-MIST-103",
        name: "Merchant A Vetiver Linen Mist",
        category: "Room Sprays",
        price: 399,
        stock: 40,
      },
    ];

    const merchantBProducts = [
      {
        merchantId: merchantB._id,
        sku: "SHARED-001",
        name: "Merchant B Neroli Blossom Oil",
        category: "Essential Oils",
        price: 549,
        stock: 32,
      },
      {
        merchantId: merchantB._id,
        sku: "B-DIFF-202",
        name: "Merchant B Hinoki Reed Diffuser",
        category: "Diffusers",
        price: 920,
        stock: 14,
      },
      {
        merchantId: merchantB._id,
        sku: "B-MIST-203",
        name: "Merchant B Jasmine Dew Mist",
        category: "Room Sprays",
        price: 349,
        stock: 50,
      },
    ];

    const insertedB = await Product.insertMany(merchantBProducts);
    await Product.insertMany(merchantAProducts);

    console.log("Seed complete.");
    console.log("--------------------------------------------------");
    console.log("Demo Merchant A -> email: merchantA@aroma.co | password: password123");
    console.log("Demo Merchant B -> email: merchantB@aroma.co | password: password123");
    console.log("Sample Merchant B Product ID for 403 test:", insertedB[0]._id.toString());
    console.log("--------------------------------------------------");

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err.message);
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  }
};

seed();