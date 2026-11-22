import csv from "csv-parser";
import { Readable } from "stream";
import Product from "../models/Product.js";

const CHUNK_SIZE = 500;

export const importCsv = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "CSV file is required" });
  }

  const rows = [];
  const stream = Readable.from(req.file.buffer);

  let responded = false;
  const sendError = (status, message, error) => {
    if (responded) return;
    responded = true;
    return res.status(status).json({ message, ...(error ? { error } : {}) });
  };

  stream
    .pipe(
      csv({
        mapHeaders: ({ header }) => header.replace(/^\uFEFF/, "").trim().toLowerCase(),
      })
    )
    .on("data", (row) => rows.push(row))
    .on("end", async () => {
      if (responded) return;
      try {
        const seenSkus = new Set();
        const validRows = [];
        const rejected = [];

        rows.forEach((raw, idx) => {
          const rowNumber = idx + 2; // Row 1 is the header row
          const sku = raw.sku === undefined ? "" : String(raw.sku).trim();
          const name = raw.name === undefined ? "" : String(raw.name).trim();
          const category = raw.category === undefined ? "" : String(raw.category).trim();
          const rawPrice = raw.price === undefined ? "" : String(raw.price).trim();
          const rawStock = raw.stock === undefined ? "" : String(raw.stock).trim();

          if (!sku || !name || !category) {
            rejected.push({
              row: rowNumber,
              sku: sku || "MISSING",
              reason: "SKU, name, and category are required",
            });
            return;
          }

          if (seenSkus.has(sku)) {
            rejected.push({
              row: rowNumber,
              sku,
              reason: `Duplicate SKU "${sku}" in the same file`,
            });
            return;
          }

          const price = Number(rawPrice);
          if (rawPrice === "" || Number.isNaN(price) || !Number.isFinite(price) || price < 0) {
            rejected.push({
              row: rowNumber,
              sku,
              reason: "Price must be a non-negative number",
            });
            return;
          }

          const stock = Number(rawStock);
          if (rawStock === "" || !Number.isInteger(stock) || stock < 0) {
            rejected.push({
              row: rowNumber,
              sku,
              reason: "Stock must be a non-negative whole number",
            });
            return;
          }

          seenSkus.add(sku);
          validRows.push({ rowNumber, sku, name, category, price, stock });
        });

        let created = 0;
        let updated = 0;

        if (validRows.length > 0) {
          for (let i = 0; i < validRows.length; i += CHUNK_SIZE) {
            const batch = validRows.slice(i, i + CHUNK_SIZE);
            const ops = batch.map((item) => ({
              updateOne: {
                filter: { merchantId: req.merchantId, sku: item.sku },
                update: {
                  $set: {
                    name: item.name,
                    category: item.category,
                    price: item.price,
                    stock: item.stock,
                  },
                  $setOnInsert: {
                    merchantId: req.merchantId,
                    sku: item.sku,
                  },
                },
                upsert: true,
              },
            }));

            const result = await Product.bulkWrite(ops, { ordered: false });
            const batchUpserted = result.upsertedCount || 0;
            created += batchUpserted;
            updated += batch.length - batchUpserted;
          }
        }

        responded = true;
        return res.json({
          summary: {
            totalRows: rows.length,
            created,
            updated,
            rejectedCount: rejected.length,
          },
          rejected,
        });
      } catch (err) {
        console.error("CSV import error:", err);
        return sendError(500, "CSV import failed", err.message);
      }
    })
    .on("error", (err) => {
      return sendError(400, "Invalid CSV format", err.message);
    });
};