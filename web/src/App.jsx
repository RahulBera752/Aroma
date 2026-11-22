import React, { useState, useCallback } from "react";
import Navbar from "./components/Navbar";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import "./style.css";

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [merchant, setMerchant] = useState(() =>
    JSON.parse(localStorage.getItem("merchant") || "null")
  );
  const [view, setView] = useState(() =>
    localStorage.getItem("token") ? "dashboard" : "landing"
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
    localStorage.setItem("token", newToken);
    localStorage.setItem("merchant", JSON.stringify(newMerchant));
    setToken(newToken);
    setMerchant(newMerchant);
    setView("dashboard");
  };

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("merchant");
    setToken("");
    setMerchant(null);
    setView("landing");
    showToast("Signed out successfully");
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
        onNavigate={navigate}
        onLogout={handleLogout}
      />

      {token && view === "dashboard" ? (
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