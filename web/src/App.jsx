import React, { useState, useCallback } from "react";
import Navbar from "./components/Navbar";
import CustomerAuthModal from "./components/CustomerAuthModal";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import CustomerCataloguePage from "./pages/CustomerCataloguePage";
import "./style.css";

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [merchant, setMerchant] = useState(() =>
    JSON.parse(localStorage.getItem("merchant") || "null")
  );

  const [customerToken, setCustomerToken] = useState(
    () => localStorage.getItem("customerToken") || ""
  );
  const [customerUser, setCustomerUser] = useState(() =>
    JSON.parse(localStorage.getItem("customerUser") || "null")
  );
  const [customerAuthOpen, setCustomerAuthOpen] = useState(false);

  const [view, setView] = useState(() =>
    localStorage.getItem("token")
      ? "dashboard"
      : localStorage.getItem("customerToken")
      ? "customer"
      : "landing"
  );
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3400);
  }, []);

  const navigate = (nextView) => {
    setView(nextView);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAuthSuccess = (newToken, newMerchant) => {
    if (newMerchant?.role === "customer") {
      localStorage.setItem("customerToken", newToken);
      localStorage.setItem("customerUser", JSON.stringify(newMerchant));
      setCustomerToken(newToken);
      setCustomerUser(newMerchant);
      setView("customer");
      return;
    }
    localStorage.setItem("token", newToken);
    localStorage.setItem("merchant", JSON.stringify(newMerchant));
    setToken(newToken);
    setMerchant(newMerchant);
    setView("dashboard");
  };

  const handleCustomerAuthSuccess = (newToken, newCustomer) => {
    localStorage.setItem("customerToken", newToken);
    localStorage.setItem("customerUser", JSON.stringify(newCustomer));
    setCustomerToken(newToken);
    setCustomerUser(newCustomer);
    setView("customer");
  };

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("merchant");
    setToken("");
    setMerchant(null);
    setView("landing");
    showToast("Merchant signed out successfully");
  }, [showToast]);

  const handleCustomerLogout = useCallback(() => {
    localStorage.removeItem("customerToken");
    localStorage.removeItem("customerUser");
    setCustomerToken("");
    setCustomerUser(null);
    showToast("Customer signed out successfully");
  }, [showToast]);

  return (
    <>
      {toast && (
        <div
          className={`toast ${
            toast.type === "error" ? "toast-error" : "toast-success"
          }`}
        >
          {toast.message}
        </div>
      )}

      <Navbar
        token={token}
        merchant={merchant}
        customerToken={customerToken}
        customerUser={customerUser}
        onNavigate={navigate}
        onLogout={handleLogout}
        onCustomerLogout={handleCustomerLogout}
        onOpenCustomerAuth={() => setCustomerAuthOpen(true)}
      />

      <CustomerAuthModal
        isOpen={customerAuthOpen}
        onClose={() => setCustomerAuthOpen(false)}
        onCustomerAuthSuccess={handleCustomerAuthSuccess}
        showToast={showToast}
      />

      {view === "customer" ? (
        <CustomerCataloguePage
          customerToken={customerToken}
          customerUser={customerUser}
          onOpenCustomerAuth={() => setCustomerAuthOpen(true)}
          onCustomerLogout={handleCustomerLogout}
          showToast={showToast}
        />
      ) : token && view === "dashboard" ? (
        <DashboardPage
          token={token}
          merchant={merchant}
          onLogout={handleLogout}
          showToast={showToast}
        />
      ) : view === "login" ? (
        <LoginPage
          onNavigate={navigate}
          onAuthSuccess={handleAuthSuccess}
          showToast={showToast}
        />
      ) : view === "register" ? (
        <RegisterPage
          onNavigate={navigate}
          onAuthSuccess={handleAuthSuccess}
          showToast={showToast}
        />
      ) : (
        <LandingPage onNavigate={navigate} />
      )}
    </>
  );
}