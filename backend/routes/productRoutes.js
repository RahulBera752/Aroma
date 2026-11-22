import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import authMiddleware from "../middleware/authMiddleware.js";
import { getProducts, updateProduct, deleteProduct } from "../controllers/productController.js";
import { importCsv } from "../controllers/importController.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `product-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

const imageUpload = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});

const handleImageUpload = (req, res, next) => {
  imageUpload.single("image")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || "Image upload failed" });
    }
    return next();
  });
};

router.get("/", authMiddleware, getProducts);
router.patch("/:id", authMiddleware, handleImageUpload, updateProduct);
router.delete("/:id", authMiddleware, deleteProduct);
router.post("/import", authMiddleware, upload.single("file"), importCsv);

export default router;