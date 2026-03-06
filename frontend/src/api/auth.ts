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

function assertNonEmptyString(
  value: unknown,
  name: string
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid ${name}`);
  }
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
}

export function setAccessToken(accessToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
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