import {
  getAccessToken,
  getRefreshToken,
  refreshAccessToken,
  clearTokens,
} from "./auth";

const API_BASE = "http://localhost:8080";

export class ApiRequestError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.details = details;
  }
}

type HttpOptions = Omit<RequestInit, "headers" | "body"> & {
  auth?: boolean;
  headers?: Record<string, string>;
  body?: unknown;
};

let refreshInFlight: Promise<string> | null = null;

function isAuthPath(path: string) {
  return path.startsWith("/api/auth/");
}

async function readSafe(res: Response): Promise<unknown> {
  try {
    const text = await res.text();
    if (!text) return null;

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch {
    return null;
  }
}

function buildBodyAndHeaders(options: HttpOptions) {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers ?? {}),
  };

  const body = options.body;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  let finalBody: BodyInit | undefined;

  if (body == null) {
    finalBody = undefined;
  } else if (
    isFormData ||
    typeof body === "string" ||
    body instanceof URLSearchParams ||
    body instanceof Blob ||
    body instanceof ArrayBuffer
  ) {
    finalBody = body as BodyInit;
  } else {
    if (!headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
    finalBody = JSON.stringify(body);
  }

  return { headers, finalBody };
}

async function doFetch(
  path: string,
  options: HttpOptions,
  tokenOverride?: string
) {
  const { headers, finalBody } = buildBodyAndHeaders(options);

  const token = tokenOverride ?? getAccessToken();
  if (token && options.auth !== false) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    body: finalBody,
  });
}

async function ensureFreshAccessToken(): Promise<string> {
  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken()
      .then((r) => r.accessToken)
      .finally(() => {
        refreshInFlight = null;
      });
  }

  return refreshInFlight;
}

export async function http<T>(path: string, options: HttpOptions = {}): Promise<T> {
  let response = await doFetch(path, options);

  const canRefresh =
    response.status === 401 &&
    options.auth !== false &&
    !isAuthPath(path) &&
    Boolean(getRefreshToken());

  if (canRefresh) {
    try {
      const newAccess = await ensureFreshAccessToken();
      response = await doFetch(path, options, newAccess);
    } catch {
      clearTokens();
      throw new ApiRequestError("Unauthorized", 401);
    }
  }

  if (response.status === 401) {
    clearTokens();
    throw new ApiRequestError("Unauthorized", 401);
  }

  if (!response.ok) {
    const details = await readSafe(response);
    const message =
      (details && typeof details === "object" && (details as any).message) ||
      (typeof details === "string" ? details : null) ||
      `Request failed (${response.status})`;

    throw new ApiRequestError(message, response.status, details);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  return (await response.text()) as unknown as T;
}