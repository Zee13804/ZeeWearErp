import { showToast } from "@/components/ui/toast";

const BASE_URL = "/api";

let isRedirectingToLogin = false;

function handleUnauthorized() {
  if (typeof window === "undefined") return;
  if (isRedirectingToLogin) return;
  if (window.location.pathname === "/login") return;

  isRedirectingToLogin = true;
  showToast("Session expired. Please sign in again.", "error");
  localStorage.removeItem("token");
  setTimeout(() => { window.location.href = "/login"; }, 1500);
}

async function apiFetch(endpoint, options = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401 && !endpoint.startsWith("/auth/")) {
      handleUnauthorized();
      throw new Error("Session expired. Redirecting to login.");
    }

    let message = `Request failed with status ${response.status}`;
    try {
      const error = await response.json();
      message = error.message || error.error || message;
    } catch {
      // response body wasn't JSON
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export function apiGet(endpoint) {
  return apiFetch(endpoint, { method: "GET" });
}

export function apiPost(endpoint, data) {
  return apiFetch(endpoint, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function apiPut(endpoint, data) {
  return apiFetch(endpoint, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function apiDelete(endpoint) {
  return apiFetch(endpoint, { method: "DELETE" });
}

export async function apiUploadFile(endpoint, file, fieldName = "image") {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const formData = new FormData();
  formData.append(fieldName, file);

  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
      throw new Error("Session expired. Redirecting to login.");
    }
    let message = `Upload failed with status ${response.status}`;
    try {
      const error = await response.json();
      message = error.message || error.error || message;
    } catch {}
    throw new Error(message);
  }

  return response.json();
}
