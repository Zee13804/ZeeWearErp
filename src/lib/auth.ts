export interface TokenPayload {
  id?: string;
  email?: string;
  role?: string;
  exp?: number;
}

export function decodeToken(): TokenPayload | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getUserRole(): string {
  const payload = decodeToken();
  return payload?.role || "";
}

export function isAdmin(): boolean {
  const role = getUserRole();
  return role === "admin" || role === "dev";
}

export function isDev(): boolean {
  return getUserRole() === "dev";
}

export function isViewer(): boolean {
  return getUserRole() === "viewer";
}
