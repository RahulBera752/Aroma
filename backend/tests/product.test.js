import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import request from "supertest";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import app from "../server.js";
import Merchant from "../models/Merchant.js";
import Product from "../models/Product.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const TEST_EMAILS = ["jest.merchantA@aroma.test", "jest.merchantB@aroma.test"];
let tokenA;
let merchantA;
let merchantB;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }

  await Merchant.deleteMany({ email: { $in: TEST_EMAILS } });

  const passwordHash = await bcrypt.hash("password123", 10);
  [merchantA, merchantB] = await Merchant.create([
    { name: "Jest Merchant A", email: "jest.merchantA@aroma.test", password: passwordHash },
    { name: "Jest Merchant B", email: "jest.merchantB@aroma.test", password: passwordHash },
  ]);

  const resA = await request(app)
    .post("/api/auth/login")
    .send({ email: "jest.merchantA@aroma.test", password: "password123" });

  tokenA = resA.body.token;
});

beforeEach(async () => {
  await Product.deleteMany({
    merchantId: { $in: [merchantA._id, merchantB._id] },
  });
});

afterAll(async () => {
  await Product.deleteMany({
    merchantId: { $in: [merchantA._id, merchantB._id] },
  });
  await Merchant.deleteMany({ email: { $in: TEST_EMAILS } });
  await mongoose.connection.close();
});

describe("Aroma Catalogue Assessment Tests", () => {
  test("1. Blocks cross-merchant access when Merchant A tries to edit Merchant B's product", async () => {
    const merchantBProduct = await Product.create({
      merchantId: merchantB._id,
      sku: "B-ONLY-001",
      name: "Merchant B Exclusive Oil",
      category: "Oils",
      price: 599,
      stock: 15,
    });

    const response = await request(app)
      .patch(`/api/products/${merchantBProduct._id}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ price: 1, stock: 999 });

    expect(response.status).toBe(403);

    const unchanged = await Product.findById(merchantBProduct._id);
    expect(unchanged.price).toBe(599);
    expect(unchanged.stock).toBe(15);
  });

  test("2. Prevents duplicates on CSV re-import and updates existing SKUs cleanly", async () => {
    const firstCsv = [
      "sku,name,category,price,stock",
      "DUP-SKU-1,Rose Mist,Fragrance,250,10",
      "DUP-SKU-2,Cedar Candle,Candles,400,20",
    ].join("\n");

    const firstImport = await request(app)
      .post("/api/products/import")
      .set("Authorization", `Bearer ${tokenA}`)
      .attach("file", Buffer.from(firstCsv), "first_import.csv");

    expect(firstImport.status).toBe(200);
    expect(firstImport.body.summary.created).toBe(2);
    expect(firstImport.body.summary.updated).toBe(0);

    const secondCsv = [
      "sku,name,category,price,stock",
      "DUP-SKU-1,Rose Mist Updated,Fragrance,299,35",
    ].join("\n");

    const secondImport = await request(app)
      .post("/api/products/import")
      .set("Authorization", `Bearer ${tokenA}`)
      .attach("file", Buffer.from(secondCsv), "second_import.csv");

    expect(secondImport.status).toBe(200);
    expect(secondImport.body.summary.created).toBe(0);
    expect(secondImport.body.summary.updated).toBe(1);

    const products = await Product.find({ merchantId: merchantA._id });
    expect(products).toHaveLength(2);

    const updatedItem = products.find((p) => p.sku === "DUP-SKU-1");
    expect(updatedItem.price).toBe(299);
    expect(updatedItem.stock).toBe(35);
  });
});