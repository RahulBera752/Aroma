import React, { useEffect, useState, useCallback, useRef } from "react";
import { apiRequest } from "../api";

const SERVER_ORIGIN = "http://localhost:8080";

function inferSubcategory(product) {
  if (product.subcategory && product.subcategory.trim()) {
    return product.subcategory.trim();
  }
  const name = (product.name || "").toLowerCase();
  const cat = (product.category || "General").trim();

  if (name.includes("chair")) return "Office Chairs";
  if (name.includes("desk") || name.includes("table")) return "Desks & Tables";
  if (name.includes("sofa") || name.includes("couch")) return "Lounge & Sofas";
  if (name.includes("lamp") || name.includes("light")) return "Lighting";
  if (name.includes("candle")) return "Soy & Wax Candles";
  if (name.includes("oil") || name.includes("elixir")) return "Pure & Diffuser Oils";
  if (name.includes("mist") || name.includes("spray")) return "Room Mists & Sprays";
  if (name.includes("diffuser")) return "Reed & Aroma Diffusers";
  if (name.includes("incense")) return "Incense & Cones";
  return `${cat} Collection`;
}

export default function DashboardPage({ token, merchant, onLogout, showToast }) {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedSubcategory, setSelectedSubcategory] = useState("All");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Bulk CSV Import Modal state
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [report, setReport] = useState(null);
  const csvInputRef = useRef(null);

  // Edit Product Modal state
  const [editingProduct, setEditingProduct] = useState(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editSubcategory, setEditSubcategory] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editStock, setEditStock] = useState("");
  const [editPhotoFile, setEditPhotoFile] = useState(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const photoInputRef = useRef(null);

  const fetchProducts = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "50",
        search,
      });
      const data = await apiRequest(`/products?${params.toString()}`, {}, token);
      setProducts(data.products || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      if (err.status === 401) {
        onLogout();
      } else {
        showToast(err.message || "Failed to load products", "error");
      }
    }
  }, [page, search, token, onLogout, showToast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const categories = [
    "All",
    ...Array.from(
      new Set(products.map((p) => (p.category || "").trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b)),
  ];

  const categoryScopedProducts =
    selectedCategory === "All"
      ? products
      : products.filter(
          (p) =>
            (p.category || "").trim().toLowerCase() ===
            selectedCategory.trim().toLowerCase()
        );

  const subcategories = [
    "All",
    ...Array.from(new Set(categoryScopedProducts.map(inferSubcategory))).sort(
      (a, b) => a.localeCompare(b)
    ),
  ];

  const filteredProducts =
    selectedSubcategory === "All"
      ? categoryScopedProducts
      : categoryScopedProducts.filter(
          (p) => inferSubcategory(p) === selectedSubcategory
        );

  const openBulkModal = () => {
    setBulkModalOpen(true);
  };

  const closeBulkModal = () => {
    setBulkModalOpen(false);
    setFile(null);
    if (csvInputRef.current) {
      csvInputRef.current.value = "";
    }
  };

  const handleFilePick = (e) => {
    const picked = e.target.files?.[0] || null;
    setFile(picked);
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!file || importing) return;

    setImporting(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const data = await apiRequest(
        "/products/import",
        { method: "POST", body: formData },
        token
      );
      setReport(data);
      setSelectedCategory("All");
      setSelectedSubcategory("All");
      setPage(1);
      closeBulkModal();
      showToast(
        `Bulk import complete: ${data.summary.created} created, ${data.summary.updated} updated, ${data.summary.rejectedCount} rejected`
      );
      await fetchProducts();
    } catch (err) {
      showToast(err.message || "CSV import failed", "error");
    } finally {
      setImporting(false);
    }
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setEditName(product.name ?? "");
    setEditCategory(product.category ?? "");
    setEditSubcategory(product.subcategory ?? inferSubcategory(product));
    setEditPrice(String(product.price ?? ""));
    setEditStock(String(product.stock ?? ""));
    setEditPhotoFile(null);
    setEditPhotoPreview(
      product.imageUrl ? `${SERVER_ORIGIN}${product.imageUrl}` : ""
    );
    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  };

  const closeEditModal = () => {
    if (editPhotoPreview && editPhotoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(editPhotoPreview);
    }
    setEditingProduct(null);
    setEditSubcategory("");
    setEditPhotoFile(null);
    setEditPhotoPreview("");
    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  };

  const handlePhotoChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.type.startsWith("image/")) {
      showToast("Please choose a valid image file (PNG, JPG, WEBP)", "error");
      e.target.value = "";
      return;
    }

    if (editPhotoPreview && editPhotoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(editPhotoPreview);
    }
    setEditPhotoFile(selected);
    setEditPhotoPreview(URL.createObjectURL(selected));
  };

  const handleSaveModal = async (e) => {
    e.preventDefault();
    if (!editingProduct || savingEdit) return;

    const trimmedName = editName.trim();
    const trimmedCategory = editCategory.trim();
    const trimmedSubcategory = editSubcategory.trim();
    const numericPrice = Number(editPrice);
    const numericStock = Number(editStock);

    if (!trimmedName || !trimmedCategory) {
      showToast("Name and category are required", "error");
      return;
    }
    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      showToast("Price must be 0 or greater", "error");
      return;
    }
    if (!Number.isInteger(numericStock) || numericStock < 0) {
      showToast("Stock must be a whole number (0 or greater)", "error");
      return;
    }

    setSavingEdit(true);
    try {
      const formData = new FormData();
      formData.append("name", trimmedName);
      formData.append("category", trimmedCategory);
      formData.append("subcategory", trimmedSubcategory);
      formData.append("price", String(numericPrice));
      formData.append("stock", String(numericStock));
      if (editPhotoFile) {
        formData.append("image", editPhotoFile);
      }

      const updatedDoc = await apiRequest(
        `/products/${editingProduct._id}`,
        {
          method: "PATCH",
          body: formData,
        },
        token
      );

      setProducts((prev) =>
        prev.map((item) =>
          item._id === editingProduct._id
            ? {
                ...item,
                ...(updatedDoc && updatedDoc._id ? updatedDoc : {}),
                name: updatedDoc?.name ?? trimmedName,
                category: updatedDoc?.category ?? trimmedCategory,
                subcategory:
                  updatedDoc?.subcategory ?? trimmedSubcategory,
                price: updatedDoc?.price ?? numericPrice,
                stock: updatedDoc?.stock ?? numericStock,
                imageUrl: updatedDoc?.imageUrl ?? item.imageUrl,
                updatedAt: updatedDoc?.updatedAt || new Date().toISOString(),
              }
            : item
        )
      );

      closeEditModal();
      showToast("Product updated successfully");
      await fetchProducts();
    } catch (err) {
      console.error("Save error:", err);
      showToast(err.message || "Update failed", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteProduct = async (product) => {
    if (!product?._id || deletingId) return;

    const confirmed = window.confirm(
      `Delete "${product.name}" (${product.sku})? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(product._id);
    try {
      await apiRequest(
        `/products/${product._id}`,
        { method: "DELETE" },
        token
      );
      showToast("Product deleted successfully");
      await fetchProducts();
    } catch (err) {
      console.error("Delete error:", err);
      showToast(err.message || "Failed to delete product", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const downloadSampleCsv = () => {
    const csvContent = [
      "sku,name,category,price,stock",
      "ARM-1001,Himalayan Cedar Diffuser Oil,Oils,649,40",
      "ARM-1002,Damask Rose Room Mist,Sprays,420,65",
      "ARM-1003,White Tea Soy Candle,Candles,799,25",
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "aroma_sample_catalogue.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const pageStockSum = filteredProducts.reduce(
    (acc, item) => acc + Number(item.stock || 0),
    0
  );

  return (
    <main className="container" style={{ paddingTop: "28px", paddingBottom: "56px" }}>
      {/* Store Banner */}
      <div
        className="card"
        style={{
          padding: "22px 26px",
          marginBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "6px",
            }}
          >
            <span className="badge badge-green">● Active Storefront</span>
            <span style={{ fontSize: "12.5px", color: "#64748b" }}>
              Tenant ID: <code>{merchant?.id || ""}</code>
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: "24px", letterSpacing: "-0.02em" }}>
            {merchant?.name || "Merchant Catalogue"}
          </h1>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-accent"
            onClick={openBulkModal}
          >
            Bulk CSV Import
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={downloadSampleCsv}
          >
            Download Sample CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        <div className="card" style={{ padding: "18px 22px" }}>
          <div
            style={{
              fontSize: "12px",
              color: "#64748b",
              fontWeight: 600,
              textTransform: "uppercase",
            }}
          >
            Total Catalogue SKUs
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, marginTop: "6px" }}>
            {total}
          </div>
        </div>

        <div className="card" style={{ padding: "18px 22px" }}>
          <div
            style={{
              fontSize: "12px",
              color: "#64748b",
              fontWeight: 600,
              textTransform: "uppercase",
            }}
          >
            Filtered Stock Units
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, marginTop: "6px" }}>
            {pageStockSum}
          </div>
        </div>

        <div className="card" style={{ padding: "18px 22px" }}>
          <div
            style={{
              fontSize: "12px",
              color: "#64748b",
              fontWeight: 600,
              textTransform: "uppercase",
            }}
          >
            Catalogue Page
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, marginTop: "6px" }}>
            {page}{" "}
            <span style={{ fontSize: "15px", color: "#64748b", fontWeight: 500 }}>
              of {totalPages}
            </span>
          </div>
        </div>
      </div>

      {/* Last Import Summary Banner */}
      {report && (
        <div className="card" style={{ padding: "18px 24px", marginBottom: "20px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <strong style={{ fontSize: "14px" }}>Last CSV Import:</strong>
              <span className="badge badge-slate">
                Total Rows: {report.summary.totalRows}
              </span>
              <span className="badge badge-green">
                Created: {report.summary.created}
              </span>
              <span className="badge badge-indigo">
                Updated: {report.summary.updated}
              </span>
              <span className="badge badge-red">
                Rejected: {report.summary.rejectedCount}
              </span>
            </div>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ padding: "5px 10px", fontSize: "12px" }}
              onClick={() => setReport(null)}
            >
              Dismiss
            </button>
          </div>

          {report.rejected && report.rejected.length > 0 && (
            <div
              style={{
                marginTop: "12px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "10px",
                padding: "12px 16px",
                maxHeight: "200px",
                overflowY: "auto",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#991b1b",
                  marginBottom: "6px",
                }}
              >
                REJECTED ROWS ({report.rejected.length})
              </div>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: "18px",
                  fontSize: "13px",
                  color: "#7f1d1d",
                  lineHeight: 1.6,
                }}
              >
                {report.rejected.map((r, i) => (
                  <li key={i}>
                    <strong>Row {r.row}</strong> (SKU: <code>{r.sku}</code>) —{" "}
                    {r.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Product Table with Category & Subcategory Filters */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "center",
                flex: 1,
                maxWidth: "430px",
              }}
            >
              <input
                className="input"
                type="text"
                placeholder="Search catalogue by SKU or product name..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
              {search && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                >
                  Clear
                </button>
              )}
            </div>

            <span style={{ fontSize: "13px", color: "#64748b" }}>
              Showing <strong>{filteredProducts.length}</strong> of{" "}
              <strong>{total}</strong> products
            </span>
          </div>

          {/* Category Filter Pills */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b" }}>
              CATEGORY:
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`btn ${
                  selectedCategory === cat ? "btn-accent" : "btn-ghost"
                }`}
                style={{ padding: "5px 12px", fontSize: "12.5px" }}
                onClick={() => {
                  setSelectedCategory(cat);
                  setSelectedSubcategory("All");
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Subcategory Filter Pills */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b" }}>
              SUBCATEGORY:
            </span>
            {subcategories.map((sub) => (
              <button
                key={sub}
                type="button"
                className={`badge ${
                  selectedSubcategory === sub ? "badge-indigo" : "badge-slate"
                }`}
                style={{ border: "none", cursor: "pointer", padding: "5px 11px" }}
                onClick={() => setSelectedSubcategory(sub)}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Photo</th>
                <th>SKU</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Subcategory</th>
                <th>Price (₹)</th>
                <th>Stock</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length > 0 ? (
                filteredProducts.map((p) => {
                  const cacheKey = p.updatedAt
                    ? `?v=${encodeURIComponent(p.updatedAt)}`
                    : "";
                  return (
                    <tr key={p._id}>
                      <td>
                        {p.imageUrl ? (
                          <img
                            src={`${SERVER_ORIGIN}${p.imageUrl}${cacheKey}`}
                            alt={p.name}
                            className="product-thumb"
                            style={{ cursor: "pointer" }}
                            onClick={() => openEditModal(p)}
                          />
                        ) : (
                          <div
                            className="product-thumb-placeholder"
                            title="Click to upload photo"
                            onClick={() => openEditModal(p)}
                          >
                            +Img
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="sku-pill">{p.sku}</span>
                      </td>
                      <td style={{ fontWeight: 600, color: "#0f172a" }}>
                        {p.name}
                      </td>
                      <td>
                        <span className="badge badge-slate">{p.category}</span>
                      </td>
                      <td style={{ fontSize: "12.5px", color: "#475569" }}>
                        {inferSubcategory(p)}
                      </td>
                      <td>₹{Number(p.price).toFixed(2)}</td>
                      <td>
                        <span
                          className={`badge ${
                            p.stock > 0 ? "badge-green" : "badge-red"
                          }`}
                        >
                          {p.stock} units
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "8px" }}>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => openEditModal(p)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ color: "#dc2626" }}
                            disabled={deletingId === p._id}
                            onClick={() => handleDeleteProduct(p)}
                          >
                            {deletingId === p._id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      textAlign: "center",
                      padding: "42px 20px",
                      color: "#64748b",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 600,
                        color: "#334155",
                        marginBottom: "4px",
                      }}
                    >
                      No products match the selected filter
                    </div>
                    <div style={{ fontSize: "13px" }}>
                      Switch Category or Subcategory above, or click{" "}
                      <strong>Bulk CSV Import</strong> to upload products.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div
          style={{
            padding: "14px 24px",
            background: "#f8fafc",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <button
            type="button"
            className="btn btn-ghost"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Previous
          </button>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next →
          </button>
        </div>
      </div>

      {/* Direct Bulk CSV Upload Modal */}
      {bulkModalOpen && (
        <div className="modal-backdrop" onClick={closeBulkModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <span className="badge badge-indigo">1,000+ Rows Supported</span>
                <h2 style={{ margin: "6px 0 0", fontSize: "18px" }}>
                  Bulk CSV Import
                </h2>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: "6px 10px" }}
                onClick={closeBulkModal}
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleImport}
              style={{
                padding: "22px 24px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "13.5px",
                  color: "#64748b",
                  lineHeight: 1.5,
                }}
              >
                Columns: <code>sku,name,category,price,stock</code>. Existing SKUs
                for your merchant update in place; duplicate SKUs in the same file
                are rejected with row numbers.
              </p>

              <div
                style={{
                  padding: "16px",
                  background: "#f8fafc",
                  borderRadius: "12px",
                  border: "1px dashed #cbd5e1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div style={{ fontSize: "13.5px", color: "#334155" }}>
                  {file ? (
                    <>
                      Selected file: <strong>{file.name}</strong>
                    </>
                  ) : (
                    "Choose a .csv file to upload"
                  )}
                </div>

                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => csvInputRef.current?.click()}
                >
                  Choose CSV File
                </button>
                <input
                  ref={csvInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  style={{ display: "none" }}
                  onChange={handleFilePick}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  paddingTop: "10px",
                  borderTop: "1px solid #e2e8f0",
                }}
              >
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={closeBulkModal}
                  disabled={importing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-accent"
                  disabled={importing || !file}
                >
                  {importing ? "Importing CSV..." : "Start Bulk Import"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product & Upload Photo Popup Modal */}
      {editingProduct && (
        <div className="modal-backdrop" onClick={closeEditModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <span className="sku-pill">{editingProduct.sku}</span>
                <h2 style={{ margin: "6px 0 0", fontSize: "18px" }}>
                  Edit Product
                </h2>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: "6px 10px" }}
                onClick={closeEditModal}
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleSaveModal}
              style={{
                padding: "22px 24px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  padding: "14px",
                  background: "#f8fafc",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                }}
              >
                {editPhotoPreview ? (
                  <img
                    src={editPhotoPreview}
                    alt="Preview"
                    style={{
                      width: "72px",
                      height: "72px",
                      borderRadius: "12px",
                      objectFit: "cover",
                      border: "1px solid #cbd5e1",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "72px",
                      height: "72px",
                      borderRadius: "12px",
                      border: "1px dashed #94a3b8",
                      background: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      color: "#64748b",
                      fontWeight: 600,
                    }}
                  >
                    No Photo
                  </div>
                )}

                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#0f172a",
                      marginBottom: "4px",
                    }}
                  >
                    Product Photo
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                      marginBottom: "8px",
                    }}
                  >
                    {editPhotoFile
                      ? editPhotoFile.name
                      : "PNG, JPG, or WEBP up to 5MB"}
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ padding: "6px 12px", fontSize: "12.5px" }}
                    onClick={() => photoInputRef.current?.click()}
                  >
                    {editPhotoPreview ? "Change Photo" : "Upload Photo"}
                  </button>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handlePhotoChange}
                  />
                </div>
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
                  Product Name
                </label>
                <input
                  className="input"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
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
                    Category
                  </label>
                  <input
                    className="input"
                    type="text"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
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
                    Subcategory
                  </label>
                  <input
                    className="input"
                    type="text"
                    value={editSubcategory}
                    onChange={(e) => setEditSubcategory(e.target.value)}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
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
                    Price (₹)
                  </label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
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
                    Stock Quantity
                  </label>
                  <input
                    className="input"
                    type="number"
                    step="1"
                    min="0"
                    value={editStock}
                    onChange={(e) => setEditStock(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  marginTop: "8px",
                  paddingTop: "14px",
                  borderTop: "1px solid #e2e8f0",
                }}
              >
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={closeEditModal}
                  disabled={savingEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-accent"
                  disabled={savingEdit}
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}