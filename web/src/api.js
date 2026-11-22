const API_BASE = "http://localhost:8080/api";

export async function apiRequest(path, options = {}, token = "") {
  const isFormData = options.body instanceof FormData;
  const headers = { ...(options.headers || {}) };

  if (isFormData) {
    delete headers["Content-Type"];
    delete headers["content-type"];
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || "Request failed");
    err.status = res.status;
    throw err;
  }
  return data;
}