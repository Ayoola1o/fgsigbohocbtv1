import { QueryClient, QueryFunction } from "@tanstack/react-query";

export async function apiRequest<T = unknown>(
  method: string,
  url: string,
  data?: any,
): Promise<T> {
  const options: RequestInit = {
    method,
    headers: {},
  };

  if (data !== undefined && method !== "GET" && method !== "HEAD") {
    if (data instanceof FormData) {
      options.body = data;
    } else {
      (options.headers as Record<string, string>)["Content-Type"] = "application/json";
      options.body = JSON.stringify(data);
    }
  }

  const res = await fetch(url, options);

  if (!res.ok) {
    let errorMessage = `API Request failed with status ${res.status}`;
    try {
      const errJson = await res.json();
      errorMessage = errJson.error || errJson.message || errorMessage;
      if (errJson.details) errorMessage += `: ${errJson.details}`;
    } catch {
      const text = await res.text();
      if (text) errorMessage = text;
    }
    throw new Error(errorMessage);
  }

  // Handle session persistence for admin & student login
  if (method === "POST" && url === "/api/admin/login") {
    const user = await res.json();
    localStorage.setItem("admin_user", JSON.stringify(user));
    return user as T;
  }
  if (method === "POST" && url === "/api/admin/logout") {
    localStorage.removeItem("admin_user");
    return { ok: true } as T;
  }
  if (method === "POST" && url === "/api/students/login") {
    const student = await res.json();
    localStorage.setItem("student_user", JSON.stringify(student));
    return student as T;
  }

  if (res.status === 204) {
    return {} as T;
  }

  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return (await res.json()) as T;
  }
  return (await res.text()) as unknown as T;
}

type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn = <T>({ on401: unauthorizedBehavior }: { on401: UnauthorizedBehavior }): QueryFunction<T> =>
  async ({ queryKey }) => {
    // Admin profile check
    if (queryKey[0] === "/api/admin/me") {
      const userStr = localStorage.getItem("admin_user");
      if (!userStr) {
        if (unauthorizedBehavior === "returnNull") return null as T;
        throw new Error("Not authenticated");
      }
      return JSON.parse(userStr) as T;
    }

    // Build URL from queryKey
    let url = queryKey[0] as string;
    if (queryKey.length > 1) {
      if (typeof queryKey[1] === "object" && queryKey[1] !== null) {
        const params = new URLSearchParams();
        Object.entries(queryKey[1]).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== "") {
            params.append(k, String(v));
          }
        });
        const qs = params.toString();
        if (qs) {
          url += (url.includes("?") ? "&" : "?") + qs;
        }
      } else {
        url = queryKey.join("/");
      }
    }

    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 401 && unauthorizedBehavior === "returnNull") {
        return null as T;
      }
      let errText = res.statusText;
      try {
        const json = await res.json();
        errText = json.error || json.message || errText;
      } catch {
        // use statusText
      }
      throw new Error(`Failed to fetch ${url}: ${errText}`);
    }

    return (await res.json()) as T;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,
      staleTime: 10 * 1000, // 10 seconds stale time
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
