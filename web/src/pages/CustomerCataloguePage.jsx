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

export default function CustomerCataloguePage({
  customerToken,
  customerUser,
  onOpenCustomerAuth,
  onCustomerLogout,
  showToast,
}) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedSubcategory, setSelectedSubcategory] = useState("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Storefront sub-pages: "browse" | "detail" | "checkout" | "confirmed" | "orders"
  const [screen, setScreen] = useState("browse");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);

  // Customer order history persisted per user
  const orderStorageKey = `aroma_orders_${customerUser?.email || customerUser?.id || "guest"}`;
  const [orders, setOrders] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(orderStorageKey) || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(orderStorageKey) || "[]");
      setOrders(Array.isArray(saved) ? saved : []);
    } catch {
      setOrders([]);
    }
  }, [orderStorageKey]);

  const saveOrders = (nextOrders) => {
    setOrders(nextOrders);
    try {
      localStorage.setItem(orderStorageKey, JSON.stringify(nextOrders));
    } catch {
      // Ignore storage quota errors
    }
  };

  // Flipkart/Amazon Checkout Form fields
  const [receiverName, setReceiverName] = useState(customerUser?.name || "");
  const [phone, setPhone] = useState("");
  const [pincode, setPincode] = useState("");
  const [cityState, setCityState] = useState("");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [upiId, setUpiId] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  const topRef = useRef(null);

  useEffect(() => {
    if (customerUser?.name && !receiverName) {
      setReceiverName(customerUser.name);
    }
  }, [customerUser, receiverName]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchCatalogue = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        category: selectedCategory,
        search,
      });
      const data = await apiRequest(`/products/public?${params.toString()}`);
      setProducts(data.products || []);
      setCategories(data.categories || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      showToast(err.message || "Failed to load catalogue", "error");
    } finally {
      setLoading(false);
    }
  }, [page, selectedCategory, search, showToast]);

  useEffect(() => {
    fetchCatalogue();
  }, [fetchCatalogue]);

  const subcategories = [
    "All",
    ...Array.from(new Set(products.map(inferSubcategory))),
  ];

  const visibleProducts =
    selectedSubcategory === "All"
      ? products
      : products.filter((p) => inferSubcategory(p) === selectedSubcategory);

  const openOrdersScreen = () => {
    if (!customerToken) {
      showToast("Please sign in as a customer to view My Orders", "error");
      onOpenCustomerAuth && onOpenCustomerAuth();
      return;
    }
    setScreen("orders");
    scrollToTop();
  };

  const openDetailScreen = (product) => {
    setSelectedProduct(product);
    setQuantity(1);
    setScreen("detail");
    scrollToTop();
  };

  const openCheckoutScreen = (product, qty = 1) => {
    if (!customerToken) {
      showToast("Please sign in or register as a customer to place an order", "error");
      onOpenCustomerAuth && onOpenCustomerAuth();
      return;
    }
    if (!product || product.stock < 1) {
      showToast("This product is currently out of stock", "error");
      return;
    }
    setSelectedProduct(product);
    setQuantity(Math.min(Math.max(1, Number(qty) || 1), Number(product.stock)));
    setScreen("checkout");
    scrollToTop();
  };

  const handleConfirmOrder = async (e) => {
    e.preventDefault();
    if (!selectedProduct || placingOrder) return;

    if (!customerToken) {
      showToast("Please sign in as a customer first", "error");
      onOpenCustomerAuth && onOpenCustomerAuth();
      return;
    }

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > Number(selectedProduct.stock)) {
      showToast(`Quantity must be between 1 and ${selectedProduct.stock}`, "error");
      return;
    }
    if (!receiverName.trim() || !phone.trim() || !address.trim()) {
      showToast("Please fill in recipient name, phone number, and delivery address", "error");
      return;
    }
    if (paymentMethod === "UPI" && !upiId.trim()) {
      showToast("Please enter your UPI ID (e.g. name@upi)", "error");
      return;
    }

    const fullAddress = [
      address.trim(),
      cityState.trim(),
      pincode.trim() ? `PIN: ${pincode.trim()}` : "",
    ]
      .filter(Boolean)
      .join(", ");

    setPlacingOrder(true);
    try {
      const res = await apiRequest(
        `/products/${selectedProduct._id}/order`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quantity: qty,
            receiverName: receiverName.trim(),
            phone: phone.trim(),
            address: fullAddress,
            paymentMethod,
          }),
        },
        customerToken
      );

      const newOrderRecord = {
        orderId: `ARM-${Date.now().toString().slice(-6)}`,
        ...res.order,
        imageUrl: selectedProduct.imageUrl,
        updatedAt: selectedProduct.updatedAt,
        merchantName: selectedProduct.merchantName || "Aroma Merchant",
        subcategory: inferSubcategory(selectedProduct),
        receiverName: receiverName.trim(),
        phone: phone.trim(),
        address: fullAddress,
        paymentMethod,
        upiId: paymentMethod === "UPI" ? upiId.trim() : "",
        status: "Order Placed",
      };

      setConfirmedOrder(newOrderRecord);
      saveOrders([newOrderRecord, ...orders]);

      showToast("Order placed successfully!");
      await fetchCatalogue();
      setScreen("confirmed");
      scrollToTop();
    } catch (err) {
      showToast(err.message || "Could not complete order", "error");
    } finally {
      setPlacingOrder(false);
    }
  };

  const renderPhoto = (product, height = "190px") => {
    const cacheKey = product?.updatedAt
      ? `?v=${encodeURIComponent(product.updatedAt)}`
      : "";
    if (product?.imageUrl) {
      return (
        <img
          src={`${SERVER_ORIGIN}${product.imageUrl}${cacheKey}`}
          alt={product.name}
          style={{
            width: "100%",
            height,
            objectFit: "cover",
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
            background: "#ffffff",
          }}
        />
      );
    }
    return (
      <div
        style={{
          width: "100%",
          height,
          borderRadius: "10px",
          background: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)",
          border: "1px dashed #cbd5e1",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#475569",
          padding: "12px",
          textAlign: "center",
          gap: "4px",
        }}
      >
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#4f46e5" }}>
          {product?.category}
        </span>
        <span style={{ fontSize: "13px", fontWeight: 700 }}>{product?.sku}</span>
        <span style={{ fontSize: "11.5px", color: "#64748b" }}>No Photo Uploaded</span>
      </div>
    );
  };

  const renderStoreHeader = () => (
    <div
      className="card"
      style={{
        padding: "20px 24px",
        marginBottom: "18px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "12px",
      }}
    >
      <div>
        <span className="badge badge-indigo">Customer Storefront</span>
        <h1 style={{ margin: "6px 0 4px", fontSize: "24px" }}>
          Aroma Marketplace Catalogue
        </h1>
        <p style={{ margin: 0, fontSize: "13.5px", color: "#64748b" }}>
          Browse all merchants' catalogues by Category → Subcategory → Item, view live prices & photos, and buy directly.
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        <span className="badge badge-slate">
          <strong>{total}</strong>&nbsp;total items
        </span>
        {customerToken && customerUser ? (
          <>
            <button
              type="button"
              className={`btn ${screen === "orders" ? "btn-accent" : "btn-ghost"}`}
              onClick={openOrdersScreen}
            >
              My Orders ({orders.length})
            </button>
            <span className="badge badge-green">
              Customer: {customerUser.name}
            </span>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onCustomerLogout}
            >
              Sign Out
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn btn-accent"
            onClick={onOpenCustomerAuth}
          >
            Customer Sign In / Register
          </button>
        )}
      </div>
    </div>
  );

  const unitPrice = Number(selectedProduct?.price || 0);
  const safeQty = Math.max(1, Number(quantity) || 1);
  const itemsSubtotal = unitPrice * safeQty;

  // =========================================================================
  // VIEW 5: MY ORDERS PAGE
  // =========================================================================
  if (screen === "orders") {
    return (
      <main
        ref={topRef}
        className="container"
        style={{ paddingTop: "24px", paddingBottom: "56px" }}
      >
        {renderStoreHeader()}

        <div
          className="card"
          style={{
            padding: "22px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              paddingBottom: "14px",
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: "20px", color: "#0f172a" }}>
                My Orders ({orders.length})
              </h2>
              <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
                Orders placed under <strong>{customerUser?.name}</strong> ({customerUser?.email})
              </p>
            </div>

            <button
              type="button"
              className="btn btn-accent"
              onClick={() => {
                setScreen("browse");
                scrollToTop();
              }}
            >
              ← Back to Catalogue
            </button>
          </div>

          {orders.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {orders.map((ord) => (
                <div
                  key={ord.orderId}
                  style={{
                    padding: "16px 18px",
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                    display: "grid",
                    gridTemplateColumns: "92px 1fr auto",
                    gap: "16px",
                    alignItems: "center",
                  }}
                >
                  {renderPhoto(ord, "86px")}

                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        flexWrap: "wrap",
                        marginBottom: "4px",
                      }}
                    >
                      <span className="badge badge-green">{ord.status || "Order Placed"}</span>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "#475569" }}>
                        Order #{ord.orderId}
                      </span>
                      <span className="sku-pill">{ord.sku}</span>
                    </div>

                    <h3 style={{ margin: "4px 0", fontSize: "16px", color: "#0f172a" }}>
                      {ord.name}
                    </h3>

                    <div style={{ fontSize: "12.5px", color: "#4f46e5", fontWeight: 600 }}>
                      Sold by: {ord.merchantName} · {ord.category} → {ord.subcategory}
                    </div>

                    <div style={{ fontSize: "12.5px", color: "#475569", marginTop: "6px" }}>
                      Delivery: <strong>{ord.receiverName}</strong> — {ord.address} ({ord.phone})
                    </div>

                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                      Payment: <strong>{ord.paymentMethod}</strong>
                      {ord.upiId ? ` (${ord.upiId})` : ""}
                      {ord.orderedAt
                        ? ` · Placed: ${new Date(ord.orderedAt).toLocaleString()}`
                        : ""}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>
                      Qty: <strong>{ord.quantity}</strong> × ₹
                      {Number(ord.unitPrice).toFixed(2)}
                    </div>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a", marginTop: "4px" }}>
                      ₹{Number(ord.totalAmount).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "36px 16px", color: "#64748b" }}>
              <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: "6px" }}>
                No orders placed yet
              </div>
              <div style={{ fontSize: "13px", marginBottom: "14px" }}>
                Open any product in the catalogue and click <strong>Buy Now</strong> to place your first order.
              </div>
              <button
                type="button"
                className="btn btn-accent"
                onClick={() => setScreen("browse")}
              >
                Browse Products
              </button>
            </div>
          )}
        </div>
      </main>
    );
  }

  // =========================================================================
  // VIEW 4: FLIPKART / AMAZON STYLE ORDER CONFIRMATION PAGE
  // =========================================================================
  if (screen === "confirmed" && confirmedOrder) {
    return (
      <main
        ref={topRef}
        className="container"
        style={{ paddingTop: "28px", paddingBottom: "56px" }}
      >
        <div
          className="card"
          style={{
            maxWidth: "820px",
            margin: "0 auto",
            overflow: "hidden",
            borderRadius: "16px",
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #15803d 0%, #166534 100%)",
              color: "#ffffff",
              padding: "28px 32px",
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
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  opacity: 0.9,
                  marginBottom: "6px",
                }}
              >
                ORDER CONFIRMED · ID #{confirmedOrder.orderId}
              </div>
              <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>
                Thank you, {confirmedOrder.receiverName}! Your order is placed.
              </h1>
              <p style={{ margin: "6px 0 0", fontSize: "13.5px", opacity: 0.92 }}>
                Inventory has been updated in real time ({confirmedOrder.remainingStock}{" "}
                units left in stock).
              </p>
            </div>
            <div
              style={{
                background: "rgba(255,255,255,0.16)",
                padding: "10px 16px",
                borderRadius: "10px",
                textAlign: "right",
              }}
            >
              <div style={{ fontSize: "11px", opacity: 0.85 }}>TOTAL PAID</div>
              <div style={{ fontSize: "22px", fontWeight: 800 }}>
                ₹{Number(confirmedOrder.totalAmount).toFixed(2)}
              </div>
            </div>
          </div>

          <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "110px 1fr",
                gap: "18px",
                padding: "16px",
                background: "#f8fafc",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                alignItems: "center",
              }}
            >
              {renderPhoto(confirmedOrder, "100px")}
              <div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  {confirmedOrder.category} → {confirmedOrder.subcategory} · SKU:{" "}
                  <code>{confirmedOrder.sku}</code>
                </div>
                <h3 style={{ margin: "4px 0 6px", fontSize: "18px", color: "#0f172a" }}>
                  {confirmedOrder.name}
                </h3>
                <div style={{ fontSize: "13px", color: "#4f46e5", fontWeight: 600 }}>
                  Sold by: {confirmedOrder.merchantName}
                </div>
                <div style={{ fontSize: "13.5px", color: "#334155", marginTop: "6px" }}>
                  Quantity: <strong>{confirmedOrder.quantity}</strong> × ₹
                  {Number(confirmedOrder.unitPrice).toFixed(2)} ={" "}
                  <strong>₹{Number(confirmedOrder.totalAmount).toFixed(2)}</strong>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "16px",
              }}
            >
              <div
                style={{
                  padding: "16px",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div
                  style={{
                    fontSize: "11.5px",
                    fontWeight: 700,
                    color: "#64748b",
                    textTransform: "uppercase",
                    marginBottom: "6px",
                  }}
                >
                  Delivery Address
                </div>
                <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>
                  {confirmedOrder.receiverName}
                </div>
                <div style={{ fontSize: "13.5px", color: "#334155", lineHeight: 1.5 }}>
                  {confirmedOrder.address}
                </div>
                <div style={{ fontSize: "13px", color: "#475569", marginTop: "6px" }}>
                  Phone: <strong>{confirmedOrder.phone}</strong>
                </div>
              </div>

              <div
                style={{
                  padding: "16px",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div
                  style={{
                    fontSize: "11.5px",
                    fontWeight: 700,
                    color: "#64748b",
                    textTransform: "uppercase",
                    marginBottom: "6px",
                  }}
                >
                  Payment & Stock Status
                </div>
                <div style={{ fontSize: "13.5px", color: "#0f172a", marginBottom: "6px" }}>
                  Payment Mode: <strong>{confirmedOrder.paymentMethod}</strong>
                  {confirmedOrder.upiId ? ` (${confirmedOrder.upiId})` : ""}
                </div>
                <div style={{ fontSize: "13px", color: "#15803d", fontWeight: 600 }}>
                  ✓ Stock updated on server: {confirmedOrder.remainingStock} units remaining
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
                flexWrap: "wrap",
                paddingTop: "12px",
                borderTop: "1px solid #e2e8f0",
              }}
            >
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: "12px 18px", fontSize: "14px", fontWeight: 700 }}
                onClick={() => {
                  setScreen("orders");
                  scrollToTop();
                }}
              >
                View My Orders ({orders.length})
              </button>
              <button
                type="button"
                className="btn btn-accent"
                style={{ padding: "12px 22px", fontSize: "14px", fontWeight: 700 }}
                onClick={() => {
                  setConfirmedOrder(null);
                  setSelectedProduct(null);
                  setScreen("browse");
                  scrollToTop();
                }}
              >
                ← Continue Shopping in Store
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // =========================================================================
  // VIEW 3: FLIPKART / AMAZON STYLE CHECKOUT PAGE (ADDRESS + PAYMENT + SUMMARY)
  // =========================================================================
  if (screen === "checkout" && selectedProduct) {
    return (
      <main
        ref={topRef}
        className="container"
        style={{ paddingTop: "24px", paddingBottom: "56px" }}
      >
        <div style={{ marginBottom: "16px" }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setScreen("detail");
              scrollToTop();
            }}
          >
            ← Back to Product
          </button>
        </div>

        <form
          onSubmit={handleConfirmOrder}
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.55fr) minmax(300px, 1fr)",
            gap: "20px",
            alignItems: "start",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {/* Step 1: Delivery Address */}
            <div className="card" style={{ overflow: "hidden" }}>
              <div
                style={{
                  background: "#4f46e5",
                  color: "#ffffff",
                  padding: "13px 20px",
                  fontWeight: 700,
                  fontSize: "14.5px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <span
                  style={{
                    background: "#ffffff",
                    color: "#4f46e5",
                    borderRadius: "6px",
                    padding: "2px 8px",
                    fontSize: "12px",
                    fontWeight: 800,
                  }}
                >
                  1
                </span>
                DELIVERY ADDRESS
              </div>

              <div
                style={{
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "12px",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "12.5px",
                        fontWeight: 600,
                        marginBottom: "6px",
                      }}
                    >
                      Full Name *
                    </label>
                    <input
                      className="input"
                      type="text"
                      placeholder="Enter recipient's full name"
                      value={receiverName}
                      onChange={(e) => setReceiverName(e.target.value)}
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
                      10-Digit Mobile Number *
                    </label>
                    <input
                      className="input"
                      type="tel"
                      placeholder="e.g. 9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "12px",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "12.5px",
                        fontWeight: 600,
                        marginBottom: "6px",
                      }}
                    >
                      PIN Code
                    </label>
                    <input
                      className="input"
                      type="text"
                      placeholder="e.g. 721429"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
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
                      City / District / State
                    </label>
                    <input
                      className="input"
                      type="text"
                      placeholder="e.g. Kolkata, West Bengal"
                      value={cityState}
                      onChange={(e) => setCityState(e.target.value)}
                    />
                  </div>
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
                    House No., Building, Street, Area *
                  </label>
                  <textarea
                    className="input"
                    rows={2}
                    placeholder="Enter complete street address and landmark"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Payment Options */}
            <div className="card" style={{ overflow: "hidden" }}>
              <div
                style={{
                  background: "#4f46e5",
                  color: "#ffffff",
                  padding: "13px 20px",
                  fontWeight: 700,
                  fontSize: "14.5px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <span
                  style={{
                    background: "#ffffff",
                    color: "#4f46e5",
                    borderRadius: "6px",
                    padding: "2px 8px",
                    fontSize: "12px",
                    fontWeight: 800,
                  }}
                >
                  2
                </span>
                PAYMENT OPTIONS
              </div>

              <div
                style={{
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {[
                  {
                    id: "UPI",
                    title: "UPI (Google Pay / PhonePe / Paytm)",
                    desc: "Pay instantly using any UPI ID",
                  },
                  {
                    id: "Credit / Debit Card",
                    title: "Credit / Debit / ATM Card",
                    desc: "Visa, Mastercard, RuPay supported",
                  },
                  {
                    id: "Net Banking",
                    title: "Net Banking",
                    desc: "All major Indian banks supported",
                  },
                  {
                    id: "Cash on Delivery",
                    title: "Cash on Delivery (COD)",
                    desc: "Pay in cash or UPI when your order arrives",
                  },
                ].map((opt) => (
                  <label
                    key={opt.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "12px",
                      padding: "12px 14px",
                      borderRadius: "10px",
                      border:
                        paymentMethod === opt.id
                          ? "1.5px solid #4f46e5"
                          : "1px solid #e2e8f0",
                      background: paymentMethod === opt.id ? "#eef2ff" : "#ffffff",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === opt.id}
                      onChange={() => setPaymentMethod(opt.id)}
                      style={{ marginTop: "3px" }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: "14px", color: "#0f172a" }}>
                        {opt.title}
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>{opt.desc}</div>
                      {opt.id === "UPI" && paymentMethod === "UPI" && (
                        <input
                          className="input"
                          type="text"
                          style={{ marginTop: "8px", maxWidth: "280px", background: "#fff" }}
                          placeholder="Enter UPI ID (e.g. rahul@okicici)"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          required
                        />
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Order & Price Summary Card */}
          <div className="card" style={{ padding: "20px", position: "sticky", top: "20px" }}>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 800,
                color: "#64748b",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                paddingBottom: "12px",
                borderBottom: "1px solid #e2e8f0",
                marginBottom: "14px",
              }}
            >
              ORDER SUMMARY & PRICE DETAILS
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "74px 1fr",
                gap: "12px",
                alignItems: "center",
                paddingBottom: "14px",
                borderBottom: "1px solid #e2e8f0",
                marginBottom: "14px",
              }}
            >
              {renderPhoto(selectedProduct, "74px")}
              <div>
                <div style={{ fontWeight: 700, fontSize: "14px", color: "#0f172a" }}>
                  {selectedProduct.name}
                </div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  SKU: <code>{selectedProduct.sku}</code>
                </div>
                <div style={{ fontSize: "12px", color: "#4f46e5", fontWeight: 600 }}>
                  Seller: {selectedProduct.merchantName || "Aroma Merchant"}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 600,
                  marginBottom: "6px",
                }}
              >
                Quantity (Max {selectedProduct.stock})
              </label>
              <input
                className="input"
                type="number"
                min="1"
                max={selectedProduct.stock}
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                fontSize: "13.5px",
                paddingBottom: "14px",
                borderBottom: "1px dashed #cbd5e1",
                marginBottom: "14px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>
                  Price ({safeQty} {safeQty > 1 ? "items" : "item"})
                </span>
                <strong>₹{itemsSubtotal.toFixed(2)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Delivery Charges</span>
                <span style={{ color: "#15803d", fontWeight: 700 }}>FREE</span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "17px",
                fontWeight: 800,
                color: "#0f172a",
                marginBottom: "16px",
              }}
            >
              <span>Total Payable</span>
              <span>₹{itemsSubtotal.toFixed(2)}</span>
            </div>

            <button
              type="submit"
              className="btn btn-accent"
              disabled={placingOrder}
              style={{
                width: "100%",
                padding: "13px 16px",
                fontSize: "14.5px",
                fontWeight: 800,
                borderRadius: "10px",
              }}
            >
              {placingOrder
                ? "Processing Order..."
                : `PLACE ORDER · ₹${itemsSubtotal.toFixed(2)}`}
            </button>
          </div>
        </form>
      </main>
    );
  }

  // =========================================================================
  // VIEW 2: FLIPKART / AMAZON STYLE PRODUCT DETAIL PAGE
  // =========================================================================
  if (screen === "detail" && selectedProduct) {
    return (
      <main
        ref={topRef}
        className="container"
        style={{ paddingTop: "24px", paddingBottom: "56px" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
            marginBottom: "16px",
          }}
        >
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setScreen("browse");
              scrollToTop();
            }}
          >
            ← Back to Storefront
          </button>

          <div style={{ fontSize: "13px", color: "#64748b" }}>
            {selectedProduct.category} → {inferSubcategory(selectedProduct)} →{" "}
            <strong style={{ color: "#0f172a" }}>{selectedProduct.name}</strong>
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: "28px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "28px",
            alignItems: "start",
          }}
        >
          <div>{renderPhoto(selectedProduct, "340px")}</div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <span className="badge badge-indigo">{selectedProduct.category}</span>
              <span className="badge badge-slate">
                {inferSubcategory(selectedProduct)}
              </span>
              <span className="sku-pill">SKU: {selectedProduct.sku}</span>
            </div>

            <h1 style={{ margin: 0, fontSize: "26px", color: "#0f172a" }}>
              {selectedProduct.name}
            </h1>

            <div style={{ fontSize: "14px", color: "#4f46e5", fontWeight: 700 }}>
              Sold by: {selectedProduct.merchantName || "Aroma Merchant"}
            </div>

            <div
              style={{
                padding: "14px 18px",
                background: "#f8fafc",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
              }}
            >
              <div style={{ fontSize: "28px", fontWeight: 800, color: "#0f172a" }}>
                ₹{Number(selectedProduct.price).toFixed(2)}
              </div>
              <div style={{ fontSize: "12.5px", color: "#15803d", fontWeight: 600 }}>
                Inclusive of all taxes · FREE Delivery
              </div>
            </div>

            <div>
              <span
                className={`badge ${
                  selectedProduct.stock > 0 ? "badge-green" : "badge-red"
                }`}
              >
                {selectedProduct.stock > 0
                  ? `In Stock (${selectedProduct.stock} units available)`
                  : "Currently Out of Stock"}
              </span>
            </div>

            {selectedProduct.stock > 0 && (
              <div style={{ maxWidth: "180px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    marginBottom: "6px",
                  }}
                >
                  Select Quantity
                </label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  max={selectedProduct.stock}
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
            )}

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "6px" }}>
              <button
                type="button"
                className="btn btn-accent"
                disabled={selectedProduct.stock < 1}
                style={{
                  padding: "13px 26px",
                  fontSize: "15px",
                  fontWeight: 800,
                  borderRadius: "10px",
                }}
                onClick={() => openCheckoutScreen(selectedProduct, quantity)}
              >
                {selectedProduct.stock < 1
                  ? "Out of Stock"
                  : `⚡ Buy Now (₹${itemsSubtotal.toFixed(2)})`}
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // =========================================================================
  // VIEW 1: FLIPKART / AMAZON STYLE MARKETPLACE STOREFRONT
  // =========================================================================
  return (
    <main
      ref={topRef}
      className="container"
      style={{ paddingTop: "24px", paddingBottom: "56px" }}
    >
      {renderStoreHeader()}

      <div className="card" style={{ padding: "18px 22px", marginBottom: "20px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
            fontSize: "13px",
            marginBottom: "14px",
            paddingBottom: "12px",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <span style={{ color: "#64748b", fontWeight: 600 }}>Browsing:</span>
          <button
            type="button"
            style={{
              background: "none",
              border: "none",
              padding: 0,
              color: "#4f46e5",
              fontWeight: 700,
              cursor: "pointer",
            }}
            onClick={() => {
              setSelectedCategory("All");
              setSelectedSubcategory("All");
              setPage(1);
            }}
          >
            All Categories
          </button>
          {selectedCategory !== "All" && (
            <>
              <span style={{ color: "#94a3b8" }}>→</span>
              <button
                type="button"
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  color: "#4f46e5",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
                onClick={() => setSelectedSubcategory("All")}
              >
                {selectedCategory}
              </button>
            </>
          )}
          {selectedSubcategory !== "All" && (
            <>
              <span style={{ color: "#94a3b8" }}>→</span>
              <span style={{ fontWeight: 700, color: "#0f172a" }}>
                {selectedSubcategory}
              </span>
            </>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "14px",
          }}
        >
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b" }}>
              1. CATEGORY:
            </span>
            {["All", ...categories].map((cat) => (
              <button
                key={cat}
                type="button"
                className={`btn ${selectedCategory === cat ? "btn-accent" : "btn-ghost"}`}
                style={{ padding: "6px 14px", fontSize: "13px" }}
                onClick={() => {
                  setSelectedCategory(cat);
                  setSelectedSubcategory("All");
                  setPage(1);
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          <input
            className="input"
            type="text"
            style={{ maxWidth: "280px" }}
            placeholder="Search product, SKU, or category..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b" }}>
            2. SUBCATEGORY:
          </span>
          {subcategories.map((sub) => (
            <button
              key={sub}
              type="button"
              className={`badge ${
                selectedSubcategory === sub ? "badge-indigo" : "badge-slate"
              }`}
              style={{ border: "none", cursor: "pointer", padding: "6px 12px" }}
              onClick={() => setSelectedSubcategory(sub)}
            >
              {sub}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: "36px", textAlign: "center", color: "#64748b" }}>
          Loading products across all merchants...
        </div>
      ) : visibleProducts.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(245px, 1fr))",
            gap: "18px",
          }}
        >
          {visibleProducts.map((product) => (
            <div
              key={product._id}
              className="card"
              style={{
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <div>
                <div
                  style={{ cursor: "pointer" }}
                  onClick={() => openDetailScreen(product)}
                >
                  {renderPhoto(product, "190px")}
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "12px",
                    gap: "6px",
                  }}
                >
                  <span className="sku-pill">{product.sku}</span>
                  <span className="badge badge-slate">{product.category}</span>
                </div>

                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "6px" }}>
                  {inferSubcategory(product)}
                </div>

                <h3
                  style={{
                    margin: "6px 0 6px",
                    fontSize: "16px",
                    color: "#0f172a",
                    cursor: "pointer",
                  }}
                  onClick={() => openDetailScreen(product)}
                >
                  {product.name}
                </h3>

                <div style={{ fontSize: "12.5px", color: "#4f46e5", fontWeight: 600 }}>
                  Sold by: {product.merchantName || "Aroma Merchant"}
                </div>
              </div>

              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: "12px",
                  }}
                >
                  <strong style={{ fontSize: "19px", color: "#0f172a" }}>
                    ₹{Number(product.price).toFixed(2)}
                  </strong>
                  <span
                    className={`badge ${
                      product.stock > 0 ? "badge-green" : "badge-red"
                    }`}
                  >
                    {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
                  </span>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ flex: 1, fontSize: "13px" }}
                    onClick={() => openDetailScreen(product)}
                  >
                    View Item
                  </button>
                  <button
                    type="button"
                    className="btn btn-accent"
                    style={{ flex: 1, fontSize: "13px" }}
                    disabled={product.stock < 1}
                    onClick={() => openCheckoutScreen(product, 1)}
                  >
                    {product.stock < 1 ? "Sold Out" : "Buy Now"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: "42px", textAlign: "center", color: "#64748b" }}>
          <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: "6px" }}>
            No products in the catalogue yet
          </div>
          <div style={{ fontSize: "13.5px" }}>
            Sign in as a Merchant and upload <code>sample_catalogue_1050.csv</code> — all uploaded SKUs will appear here immediately with merchant name and price.
          </div>
        </div>
      )}

      <div
        className="card"
        style={{
          marginTop: "20px",
          padding: "14px 24px",
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
        <span style={{ fontSize: "13px", fontWeight: 600 }}>
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
    </main>
  );
}