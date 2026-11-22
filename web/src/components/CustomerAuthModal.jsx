import React, { useState } from "react";
import { apiRequest } from "../api";

export default function CustomerAuthModal({
  isOpen,
  onClose,
  onCustomerAuthSuccess,
  showToast,
}) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const trimmedEmail = email.trim();
    const trimmedName = name.trim();

    if (!trimmedEmail || !password) {
      showToast("Email and password are required", "error");
      return;
    }
    if (mode === "register" && !trimmedName) {
      showToast("Please enter your name", "error");
      return;
    }

    setSubmitting(true);
    try {
      const endpoint =
        mode === "register" ? "/auth/register" : "/auth/login";
      const payload =
        mode === "register"
          ? { name: trimmedName, email: trimmedEmail, password, role: "customer" }
          : { email: trimmedEmail, password };

      const data = await apiRequest(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const userObj = data.user ||
        data.merchant || {
          name: trimmedName || trimmedEmail,
          email: trimmedEmail,
          role: "customer",
        };
      const authToken = data.token;

      if (!authToken) {
        showToast("Authentication token missing from response", "error");
        return;
      }

      onCustomerAuthSuccess(authToken, {
        ...userObj,
        role: userObj.role || "customer",
      });
      setPassword("");
      onClose();
      showToast(
        mode === "register"
          ? "Customer account created and signed in"
          : "Signed in as customer"
      );
    } catch (err) {
      showToast(err.message || "Customer authentication failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <span className="badge badge-indigo">Customer Account</span>
            <h2 style={{ margin: "6px 0 0", fontSize: "18px" }}>
              {mode === "login" ? "Customer Sign In" : "Create Customer Account"}
            </h2>
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: "6px 10px" }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              className={`btn ${mode === "login" ? "btn-accent" : "btn-ghost"}`}
              style={{ flex: 1, fontSize: "13px" }}
              onClick={() => setMode("login")}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`btn ${mode === "register" ? "btn-accent" : "btn-ghost"}`}
              style={{ flex: 1, fontSize: "13px" }}
              onClick={() => setMode("register")}
            >
              Register
            </button>
          </div>

          {mode === "register" && (
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  marginBottom: "6px",
                }}
              >
                Full Name
              </label>
              <input
                className="input"
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div>
            <label
              style={{
                display: "block",
                fontSize: "12.5px",
                fontWeight: 600,
                marginBottom: "6px",
              }}
            >
              Email
            </label>
            <input
              className="input"
              type="email"
              placeholder="customer@example.com"
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
                marginBottom: "6px",
              }}
            >
              Password
            </label>
            <input
              className="input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              paddingTop: "12px",
              borderTop: "1px solid #e2e8f0",
            }}
          >
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-accent"
              disabled={submitting}
            >
              {submitting
                ? "Please wait..."
                : mode === "login"
                ? "Sign In"
                : "Register & Sign In"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}