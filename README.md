# Aroma — Multi-Tenant Merchant Catalogue Platform

Aroma is a full-stack multi-tenant product catalogue management platform where independent merchants can sign in, bulk-import product catalogues via CSV (1,000+ rows), search and paginate their inventory, and manage product pricing, stock, and photos with strict server-side tenant isolation.

---

## Tech Stack

- **Frontend:** React (Vite), Vanilla CSS
- **Backend:** Node.js, Express.js
- **Database:** MongoDB & Mongoose
- **Authentication:** JSON Web Tokens (JWT) & bcryptjs
- **File & CSV Processing:** Multer (memory & disk storage), `csv-parser`
- **Testing:** Node.js Test Runner (`node:test`) & Supertest

---

## Key Features

1. **Server-Side Merchant Isolation**
   - Every product record is scoped to `merchantId` extracted from the verified JWT (`req.merchantId`).
   - Listing and searching (`GET /api/products`) filter strictly by `{ merchantId: req.merchantId }`.
   - Direct `PATCH /api/products/:id` or `DELETE /api/products/:id` requests against another merchant's product ID are rejected on the server with `403 Forbidden`.

2. **Bulk CSV Import (`1,000+` Rows Supported)**
   - Accepts CSV files with headers: `sku,name,category,price,stock`.
   - Validates every row: requires `sku`, `name`, and `category`; enforces non-negative numbers for `price` and non-negative whole numbers for `stock`.
   - Scopes uniqueness by `(merchantId, sku)` via a MongoDB compound unique index—different merchants can share the same SKU, while re-uploading an existing SKU for the same merchant updates the product in place without creating duplicates.
   - Rejects duplicate SKUs appearing within the same CSV file and reports the exact row number and reason.
   - Imports all valid rows in chunked batches (`500` rows per `bulkWrite`) even when invalid rows exist, returning a detailed summary (`totalRows`, `created`, `updated`, `rejectedCount`) and row-level error list.

3. **Catalogue Dashboard**
   - Paginated product table (`15` items per page) with live search by `sku` or `name`.
   - Persistent inline modal editing for product name, category, price, stock, and product image, plus product deletion.

---

## Demo Credentials

*(Update these credentials if you used custom emails/passwords in `backend/seed.js`)*

| Role | Merchant Store | Email | Password |
| :--- | :--- | :--- | :--- |
| **Merchant 1** | Aroma Store A | `merchantA@aroma.com` | `Password123` |
| **Merchant 2** | Aroma Store B | `merchantB@aroma.com` | `Password123` |
| **Merchant 3** | Aroma Store C | `berarahul@gmail.com` | `Rahul753` |

> **Tip:** You can also register new merchant accounts directly from the sign-in screen or run `node seed.js` inside `backend/` to populate demo data.

---

## Local Setup Instructions

### Prerequisites
- **Node.js** (v18+ recommended)
- **MongoDB** (local MongoDB instance or MongoDB Atlas connection string)

### 1. Clone the Repository
```bash
git clone [https://github.com/RahulBera752/Aroma.git](https://github.com/RahulBera752/Aroma.git)
cd Aroma
