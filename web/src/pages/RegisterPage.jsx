import React, { useState } from "react";
import { apiRequest } from "../api";

export default function RegisterPage({ onNavigate, onAuthSuccess, showToast }) {
  const [fullName, setFullName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const combinedName =
      storeName.trim() && fullName.trim()
        ? `${storeName.trim()} (${fullName.trim()})`
        : storeName.trim() || fullName.trim();

    try {
      const data = await apiRequest("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: combinedName,
          email: email.trim(),
          password,
        }),
      });
      onAuthSuccess(data.token, data.merchant);
      showToast(`Account created! Welcome, ${data.merchant.name}`);
    } catch (err) {
      setError(err.message || "Registration failed");
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
              NEW STOREFRONT ONBOARDING
            </span>
            <h2
              style={{
                margin: "0 0 14px",
                fontSize: "28px",
                lineHeight: 1.2,
                letterSpacing: "-0.02em",
              }}
            >
              Create your merchant account in seconds.
            </h2>
            <p
              style={{
                margin: 0,
                color: "#cbd5e1",
                fontSize: "14px",
                lineHeight: 1.6,
              }}
            >
              Enter your name, store details, email, and password to set up your
              isolated product catalogue.
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
            "Instant setup with zero SKU collisions across storefronts."
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
              marginBottom: "24px",
            }}
          >
            <button
              type="button"
              className="btn"
              style={{ flex: 1, color: "#64748b" }}
              onClick={() => onNavigate("login")}
            >
              Log In
            </button>
            <button
              type="button"
              className="btn"
              style={{
                flex: 1,
                background: "#fff",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              }}
            >
              Sign Up
            </button>
          </div>

          <h1 style={{ margin: "0 0 6px", fontSize: "22px" }}>
            Create Account (Sign Up)
          </h1>
          <p
            style={{
              margin: "0 0 20px",
              fontSize: "13.5px",
              color: "#64748b",
            }}
          >
            Fill in your name, store name, email, and password to get started.
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
                Your Full Name
              </label>
              <input
                className="input"
                type="text"
                placeholder="e.g. Rahul Bera"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
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
                Store / Business Name
              </label>
              <input
                className="input"
                type="text"
                placeholder="e.g. Aroma Botanica"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
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
                Email Address
              </label>
              <input
                className="input"
                type="email"
                placeholder="you@company.com"
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
                placeholder="Create a password (min. 6 characters)"
                minLength={6}
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
              {loading ? "Creating Account..." : "Sign Up & Create Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}