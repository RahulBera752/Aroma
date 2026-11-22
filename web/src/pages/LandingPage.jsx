import React from "react";

export default function LandingPage({ onNavigate }) {
  return (
    <>
      {/* Hero Section */}
      <section
        style={{
          background:
            "radial-gradient(circle at top right, #eef2ff 0%, #f8fafc 55%)",
          padding: "72px 0 64px",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <div
          className="container hero-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1.15fr 0.85fr",
            gap: "48px",
            alignItems: "center",
          }}
        >
          <div>
            <span className="badge badge-indigo" style={{ marginBottom: "16px" }}>
              MULTI-MERCHANT COMMERCE CLOUD
            </span>
            <h1
              style={{
                margin: "0 0 18px",
                fontSize: "44px",
                lineHeight: 1.12,
                letterSpacing: "-0.035em",
                color: "#0f172a",
              }}
            >
              Manage thousands of SKUs across isolated merchant storefronts.
            </h1>
            <p
              style={{
                margin: "0 0 28px",
                fontSize: "17px",
                lineHeight: 1.6,
                color: "#475569",
                maxWidth: "560px",
              }}
            >
              Onboard your store in seconds, bulk-upload product catalogues via
              validated CSV pipelines, and adjust real-time pricing and stock
              with zero SKU collisions.
            </p>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn-accent"
                style={{ padding: "13px 22px", fontSize: "15px" }}
                onClick={() => onNavigate("register")}
              >
                Open Your Merchant Store →
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: "13px 22px", fontSize: "15px" }}
                onClick={() => onNavigate("login")}
              >
                Sign In to Existing Account
              </button>
            </div>
            <div
              style={{
                marginTop: "26px",
                display: "flex",
                gap: "24px",
                flexWrap: "wrap",
                fontSize: "13px",
                color: "#64748b",
                fontWeight: 500,
              }}
            >
              <span>✓ Strict Tenant Isolation</span>
              <span>✓ Idempotent CSV Upserts</span>
              <span>✓ Instant Inline Price & Stock Sync</span>
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="card" style={{ padding: "24px", background: "#ffffff" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#64748b",
                    fontWeight: 600,
                  }}
                >
                  LIVE CATALOGUE PREVIEW
                </div>
                <div style={{ fontSize: "16px", fontWeight: 700 }}>
                  Aroma Essentials Storefront
                </div>
              </div>
              <span className="badge badge-green">● Synced</span>
            </div>

            <div
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                overflow: "hidden",
                marginBottom: "14px",
              }}
            >
              <table>
                <thead>
                  <tr>
                    <th style={{ padding: "10px 12px" }}>SKU</th>
                    <th style={{ padding: "10px 12px" }}>Product</th>
                    <th style={{ padding: "10px 12px" }}>Price</th>
                    <th style={{ padding: "10px 12px" }}>Stock</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: "10px 12px" }}>
                      <span className="sku-pill">ARM-01</span>
                    </td>
                    <td style={{ padding: "10px 12px", fontWeight: 600 }}>
                      Sandalwood Oil
                    </td>
                    <td style={{ padding: "10px 12px" }}>₹499</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span className="badge badge-green">30</span>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "10px 12px" }}>
                      <span className="sku-pill">ARM-02</span>
                    </td>
                    <td style={{ padding: "10px 12px", fontWeight: 600 }}>
                      Jasmine Mist
                    </td>
                    <td style={{ padding: "10px 12px" }}>₹349</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span className="badge badge-green">50</span>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "10px 12px" }}>
                      <span className="sku-pill">ARM-03</span>
                    </td>
                    <td style={{ padding: "10px 12px", fontWeight: 600 }}>
                      Cedar Candle
                    </td>
                    <td style={{ padding: "10px 12px" }}>₹799</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span className="badge badge-indigo">18</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "12.5px",
                color: "#64748b",
              }}
            >
              <span>CSV Import Summary: 3 created, 0 rejected</span>
              <strong style={{ color: "#4f46e5" }}>100% Validated</strong>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section style={{ padding: "64px 0" }}>
        <div className="container">
          <div
            style={{
              textAlign: "center",
              maxWidth: "600px",
              margin: "0 auto 40px",
            }}
          >
            <h2
              style={{
                margin: "0 0 10px",
                fontSize: "28px",
                letterSpacing: "-0.02em",
              }}
            >
              Built for modern multi-tenant commerce
            </h2>
            <p style={{ margin: 0, color: "#64748b", fontSize: "15px" }}>
              Everything a merchant needs to keep inventory clean, accurate, and
              ready for scale.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "20px",
            }}
          >
            <div className="card" style={{ padding: "26px" }}>
              <span
                className="badge badge-indigo"
                style={{ marginBottom: "12px" }}
              >
                01 • SECURITY
              </span>
              <h3 style={{ margin: "0 0 8px", fontSize: "18px" }}>
                Isolated Merchant Vaults
              </h3>
              <p
                style={{
                  margin: 0,
                  color: "#475569",
                  fontSize: "14px",
                  lineHeight: 1.6,
                }}
              >
                Every merchant account operates in its own scoped namespace. Two
                merchants can use identical SKUs without ever exposing or
                overwriting each other's data.
              </p>
            </div>

            <div className="card" style={{ padding: "26px" }}>
              <span
                className="badge badge-green"
                style={{ marginBottom: "12px" }}
              >
                02 • AUTOMATION
              </span>
              <h3 style={{ margin: "0 0 8px", fontSize: "18px" }}>
                Smart CSV Bulk Ingestion
              </h3>
              <p
                style={{
                  margin: 0,
                  color: "#475569",
                  fontSize: "14px",
                  lineHeight: 1.6,
                }}
              >
                Upload thousands of rows at once. Valid rows upsert
                automatically while invalid prices, negative stock, or duplicate
                SKUs are flagged line-by-line.
              </p>
            </div>

            <div className="card" style={{ padding: "26px" }}>
              <span
                className="badge badge-slate"
                style={{ marginBottom: "12px" }}
              >
                03 • VELOCITY
              </span>
              <h3 style={{ margin: "0 0 8px", fontSize: "18px" }}>
                Real-Time Inline Editing
              </h3>
              <p
                style={{
                  margin: 0,
                  color: "#475569",
                  fontSize: "14px",
                  lineHeight: 1.6,
                }}
              >
                Search by SKU or product title instantaneously and update unit
                prices or stock quantities right inside your catalogue table.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid #e2e8f0",
          background: "#ffffff",
          padding: "26px 0",
          color: "#64748b",
          fontSize: "13px",
        }}
      >
        <div
          className="container"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <span>
            © {new Date().getFullYear()} AromaMerchant Platform. All rights
            reserved.
          </span>
          <span>Multi-Merchant Catalogue & Inventory Engine</span>
        </div>
      </footer>
    </>
  );
}