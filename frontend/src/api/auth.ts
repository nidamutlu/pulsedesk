import { http, ApiRequestError } from "./http";

const ACCESS_TOKEN_KEY = "pulsedesk.accessToken";
const REFRESH_TOKEN_KEY = "pulsedesk.refreshToken";

export type LoginRequest = {
  username: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
};

export type RefreshResponse = {
  accessToken: string;
};

export type UserRole = "ADMIN" | "AGENT" | "REQUESTER";

export type AuthUser = {
  username: string;
  userId: number;
  role: UserRole;
  teamId: number | null;
};

type JwtPayload = {
  sub?: unknown;
  uid?: unknown;
  role?: unknown;
  teamId?: unknown;
  exp?: unknown;
  iat?: unknown;
  typ?: unknown;
};

function assertNonEmptyString(
  value: unknown,
  name: string
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid ${name}`);
  }
}

function notifyAuthChanged() {
  window.dispatchEvent(new Event("auth-changed"));
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "="
  );
  return atob(padded);
}

function parseJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    const decoded = base64UrlDecode(parts[1]);
    const payload = JSON.parse(decoded) as JwtPayload;
    return payload;
  } catch {
    return null;
  }
}

function toNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toRole(value: unknown): UserRole | null {
  if (value === "ADMIN" || value === "AGENT" || value === "REQUESTER") {
    return value;
  }
  return null;
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(tokens: LoginResponse) {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  notifyAuthChanged();
}

export function setAccessToken(accessToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  notifyAuthChanged();
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  notifyAuthChanged();
}

export function isAuthenticated() {
  return Boolean(getAccessToken());
}

export function getCurrentUser(): AuthUser | null {
  const token = getAccessToken();
  if (!token) return null;

  const payload = parseJwtPayload(token);
  if (!payload) return null;

  const username =
    typeof payload.sub === "string" && payload.sub.trim().length > 0
      ? payload.sub
      : null;

  const userId =
    typeof payload.uid === "number" && Number.isFinite(payload.uid)
      ? payload.uid
      : null;

  const role = toRole(payload.role);
  const teamId = toNullableNumber(payload.teamId);

  if (!username || userId === null || !role) {
    return null;
  }

  return {
    username,
    userId,
    role,
    teamId,
  };
}

export async function login(body: LoginRequest): Promise<LoginResponse> {
  const data = await http<unknown>("/api/auth/login", {
    method: "POST",
    auth: false,
    body,
  });

  const accessToken = (data as any)?.accessToken;
  const refreshToken = (data as any)?.refreshToken;

  assertNonEmptyString(accessToken, "accessToken");
  assertNonEmptyString(refreshToken, "refreshToken");

  const tokens: LoginResponse = { accessToken, refreshToken };
  setTokens(tokens);
  return tokens;
}

export async function refreshAccessToken(): Promise<RefreshResponse> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error("Missing refresh token");
  }

  const data = await http<unknown>("/api/auth/refresh", {
    method: "POST",
    auth: false,
    body: { refreshToken },
  });

  const accessToken = (data as any)?.accessToken;
  assertNonEmptyString(accessToken, "accessToken");

  setAccessToken(accessToken);
  return { accessToken };
}

export function logout() {
  clearTokens();
}

export function getAuthErrorMessage(err: unknown): string {
  if (err instanceof ApiRequestError) {
    if (err.status === 401) {
      return "Invalid username or password.";
    }
    return err.message;
  }

  if (err instanceof Error) {
    return err.message;
  }

  return "Authentication failed.";
}