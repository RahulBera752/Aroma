import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Merchant from "../models/Merchant.js";

const generateToken = (account) =>
  jwt.sign(
    {
      merchantId: account._id,
      userId: account._id,
      role: account.role || "merchant",
    },
    process.env.JWT_SECRET,
    { expiresIn: "24h" }
  );

export const register = async (req, res) => {
  try {
    const name = (req.body?.name || "").trim();
    const email = (req.body?.email || "").toLowerCase().trim();
    const password = req.body?.password || "";
    const role = req.body?.role === "customer" ? "customer" : "merchant";

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const existing = await Merchant.findOne({ email });
    if (existing) {
      return res
        .status(409)
        .json({ message: "An account with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const account = await Merchant.create({
      name,
      email,
      password: passwordHash,
      role,
    });

    const token = generateToken(account);
    const payload = {
      id: account._id,
      name: account.name,
      email: account.email,
      role: account.role,
    };

    return res.status(201).json({
      token,
      merchant: payload,
      user: payload,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Registration failed", error: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const email = (req.body?.email || "").toLowerCase().trim();
    const password = req.body?.password || "";

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const account = await Merchant.findOne({ email });
    if (!account) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(account);
    const payload = {
      id: account._id,
      name: account.name,
      email: account.email,
      role: account.role || "merchant",
    };

    return res.json({
      token,
      merchant: payload,
      user: payload,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Login failed", error: err.message });
  }
};