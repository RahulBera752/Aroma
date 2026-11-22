import React from "react";

export default function Navbar({ token, merchant, onNavigate, onLogout }) {
  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <div
          className="brand"
          onClick={() => onNavigate(token ? "dashboard" : "landing")}
        >
          <div className="brand-icon">A</div>
          <span>
            Aroma<span style={{ color: "#4f46e5" }}>Merchant</span>
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {token ? (
            <>
              <span className="badge badge-slate hide-mobile">
                {merchant?.email || ""}
              </span>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => onNavigate("dashboard")}
              >
                Catalogue
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={onLogout}
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-ghost hide-mobile"
                onClick={() => onNavigate("landing")}
              >
                Platform
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => onNavigate("login")}
              >
                Sign In
              </button>
              <button
                type="button"
                className="btn btn-accent"
                onClick={() => onNavigate("register")}
              >
                Create Free Account
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}