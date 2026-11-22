import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

const container =
  document.getElementById("root") || document.getElementById("app");

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);