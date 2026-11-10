import { QueryClient, QueryFunction } from "@tanstack/react-query";

export interface ApiRequestOptions {
  timeoutMs?: number;
  retries?: number;
}

export class ApiRequestError extends Error {
  constructor(message: string, public readonly status: number, public readonly retryable: boolean) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export const isRetryableApiError = (error: unknown): boolean =>
  error instanceof ApiRequestError
    ? error.retryable
    : error instanceof TypeError || (error instanceof Error && error.name === "AbortError");

const delay = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

const errorFromResponse = (response: Response, body: string): ApiRequestError => {
  let message = `API request failed with status ${response.status}`;
  if (body) {
    try {
      const parsed = JSON.parse(body);
      message = parsed.error || parsed.message || message;
      if (parsed.details) message += `: ${parsed.details}`;
    } catch {
      message = body;
    }
  }
  return new ApiRequestError(message, response.status, response.status >= 500);
};

export async function apiRequest<T = unknown>(
  method: string,
  url: string,
  data?: any,
  requestOptions: ApiRequestOptions = {},
): Promise<T> {
  const options: RequestInit = {
    method,
    headers: {},
    credentials: "same-origin",
  };

  if (data !== undefined && method !== "GET" && method !== "HEAD") {
    if (data instanceof FormData) {
      options.body = data;
    } else {
      (options.headers as Record<string, string>)["Content-Type"] = "application/json";
      options.body = JSON.stringify(data);
    }
  }

  const retryCount = requestOptions.retries ?? 0;
  const timeoutMs = requestOptions.timeoutMs ?? 25_000;
  let response: Response | undefined;
  let responseBody = "";

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      throw new ApiRequestError("You are offline. Your answers are saved on this device; reconnect to continue.", 0, true);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      response = await fetch(url, { ...options, signal: controller.signal });
      responseBody = response.status === 204 ? "" : await response.text();
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "AbortError";
      const retryableError = new ApiRequestError(
        timedOut
          ? "The server is taking longer than expected. Check your connection and retry."
          : "Unable to reach the server. Check your connection and retry.",
        0,
        true,
      );
      if (attempt < retryCount) {
        await delay(Math.min(750 * (2 ** attempt), 4_000));
        continue;
      }
      throw retryableError;
    } finally {
      clearTimeout(timeout);
    }

    if (response.status >= 500 && attempt < retryCount) {
      await delay(Math.min(750 * (2 ** attempt), 4_000));
      continue;
    }
    break;
  }

  if (!response) throw new ApiRequestError("No response was received from the server.", 0, true);
  if (!response.ok) throw errorFromResponse(response, responseBody);

  const parseJson = (): T => {
    try {
      return JSON.parse(responseBody) as T;
    } catch {
      throw new ApiRequestError("The server returned an invalid JSON response.", response?.status || 200, false);
    }
  };

  // Handle local profile state after login/logout. The auth cookie itself is HttpOnly.
  if (method === "POST" && url === "/api/admin/login") {
    const user = parseJson();
    localStorage.setItem("admin_user", JSON.stringify(user));
    return user as T;
  }
  if (method === "POST" && url === "/api/admin/logout") {
    localStorage.removeItem("admin_user");
    return { ok: true } as T;
  }
  if (method === "POST" && url === "/api/students/login") {
    const student = parseJson();
    localStorage.setItem("student_user", JSON.stringify(student));
    return student as T;
  }
  if (method === "POST" && url === "/api/students/logout") {
    localStorage.removeItem("student_user");
    return { ok: true } as T;
  }

  if (response.status === 204) return {} as T;
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) return parseJson();
  return responseBody as unknown as T;
}

type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn = <T>({ on401: unauthorizedBehavior }: { on401: UnauthorizedBehavior }): QueryFunction<T> =>
  async ({ queryKey }) => {
    let url = queryKey[0] as string;
    if (queryKey.length > 1) {
      if (typeof queryKey[1] === "object" && queryKey[1] !== null) {
        const params = new URLSearchParams();
        Object.entries(queryKey[1]).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") params.append(key, String(value));
        });
        const search = params.toString();
        if (search) url += (url.includes("?") ? "&" : "?") + search;
      } else {
        url = queryKey.join("/");
      }
    }

    try {
      return await apiRequest<T>("GET", url);
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401 && unauthorizedBehavior === "returnNull") {
        return null as T;
      }
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000,
      retry: (failureCount, error) => failureCount < 2 && isRetryableApiError(error),
      retryDelay: attempt => Math.min(1_000 * (2 ** attempt), 5_000),
    },
    mutations: { retry: false },
  },
});
