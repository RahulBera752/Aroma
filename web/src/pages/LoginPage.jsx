import React, { useState } from "react";
import { apiRequest } from "../api";

export default function LoginPage({ onNavigate, onAuthSuccess, showToast }) {
  const [role, setRole] = useState("merchant"); // "merchant" | "customer"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isCustomer = role === "customer";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          role,
        }),
      });

      const account = data.merchant ||
        data.user || {
          name: email.trim().split("@")[0],
          email: email.trim(),
          role: data.role || role,
        };
      const resolvedRole = account.role || data.role || role;

      onAuthSuccess(data.token, { ...account, role: resolvedRole });
      showToast(`Signed in as ${account.name}`);
    } catch (err) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: "48px 24px" }}>
      <div
        className="card auth-grid"
        style={{
          maxWidth: "920px",
          margin: "0 auto",
          overflow: "hidden",
          display: "grid",
          gridTemplateColumns: "1fr 1.1fr",
        }}
      >
        {/* Left Brand Panel */}
        <div
          style={{
            background: "linear-gradient(155deg, #0f172a 0%, #312e81 100%)",
            color: "#ffffff",
            padding: "40px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <span
              className="badge"
              style={{
                background: "rgba(255,255,255,0.14)",
                color: "#e0e7ff",
                marginBottom: "18px",
              }}
            >
              {isCustomer ? "CUSTOMER STOREFRONT" : "MERCHANT WORKSPACE"}
            </span>
            <h2
              style={{
                margin: "0 0 14px",
                fontSize: "28px",
                lineHeight: 1.2,
                letterSpacing: "-0.02em",
              }}
            >
              {isCustomer
                ? "Welcome back to the Aroma customer store."
                : "Welcome back to your merchant command center."}
            </h2>
            <p
              style={{
                margin: 0,
                color: "#cbd5e1",
                fontSize: "14px",
                lineHeight: 1.6,
              }}
            >
              {isCustomer
                ? "Sign in with your customer account to browse categories and subcategories, view product photos, and order items."
                : "Sign in with your account credentials to access your private product catalogue, bulk CSV uploader, and live inventory controls."}
            </p>
          </div>
          <div
            style={{
              marginTop: "32px",
              paddingTop: "20px",
              borderTop: "1px solid rgba(255,255,255,0.14)",
              fontSize: "13px",
              color: "#cbd5e1",
            }}
          >
            {isCustomer
              ? '"Browse by category, inspect item photos, and place orders directly."'
              : '"Each merchant account keeps its own isolated products, stock counts, and CSV imports."'}
          </div>
        </div>

        {/* Right Form Panel */}
        <div style={{ padding: "40px" }}>
          <div
            style={{
              display: "flex",
              gap: "8px",
              background: "#f1f5f9",
              padding: "4px",
              borderRadius: "10px",
              marginBottom: "16px",
            }}
          >
            <button
              type="button"
              className="btn"
              style={{
                flex: 1,
                background: "#fff",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              className="btn"
              style={{ flex: 1, color: "#64748b" }}
              onClick={() => onNavigate("register")}
            >
              Create Account
            </button>
          </div>

          {/* Account Type Switcher: Merchant vs Customer */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              padding: "4px",
              borderRadius: "10px",
              marginBottom: "20px",
            }}
          >
            <button
              type="button"
              className="btn"
              style={{
                background: !isCustomer ? "#4f46e5" : "transparent",
                color: !isCustomer ? "#ffffff" : "#475569",
                fontWeight: 600,
                fontSize: "13px",
              }}
              onClick={() => setRole("merchant")}
            >
              Merchant Account
            </button>
            <button
              type="button"
              className="btn"
              style={{
                background: isCustomer ? "#4f46e5" : "transparent",
                color: isCustomer ? "#ffffff" : "#475569",
                fontWeight: 600,
                fontSize: "13px",
              }}
              onClick={() => setRole("customer")}
            >
              Customer Account
            </button>
          </div>

          <h1 style={{ margin: "0 0 6px", fontSize: "22px" }}>
            {isCustomer ? "Customer Sign In" : "Merchant Sign In"}
          </h1>
          <p
            style={{
              margin: "0 0 20px",
              fontSize: "13.5px",
              color: "#64748b",
            }}
          >
            {isCustomer
              ? "Enter your email and password to browse and order products."
              : "Enter your email and password to open your merchant store."}
          </p>

          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "14px" }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  color: "#334155",
                  marginBottom: "6px",
                }}
              >
                {isCustomer ? "Customer Email" : "Work Email"}
              </label>
              <input
                className="input"
                type="email"
                placeholder={isCustomer ? "customer@example.com" : "you@company.com"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  color: "#334155",
                  marginBottom: "6px",
                }}
              >
                Password
              </label>
              <input
                className="input"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div
                className="badge badge-red"
                style={{
                  borderRadius: "9px",
                  padding: "10px 12px",
                  justifyContent: "flex-start",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-accent"
              style={{ padding: "12px 16px", fontSize: "14.5px", marginTop: "4px" }}
              disabled={loading}
            >
              {loading
                ? "Signing In..."
                : isCustomer
                ? "Sign In to Customer Store"
                : "Sign In to Dashboard"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}