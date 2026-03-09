export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("auth_token");
  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse(res: Response, path: string) {
  if (!res.ok) {
    const contentType = res.headers.get("content-type") || "";
    let errorMessage = `Request to ${path} failed: ${res.status} ${res.statusText}`;
    
    // Try to parse JSON error response for better error messages
    if (contentType.includes("application/json")) {
      try {
        const errorData = await res.json();
        if (errorData.detail) {
          // Handle validation errors (array of error objects)
          if (Array.isArray(errorData.detail)) {
            const messages = errorData.detail.map((err: any) => {
              // Extract a user-friendly message
              if (err.msg) {
                return err.msg;
              }
              return `${err.loc?.join(".") || "field"}: ${err.msg || "validation error"}`;
            });
            errorMessage = messages.join(", ");
          } else if (typeof errorData.detail === "string") {
            errorMessage = errorData.detail;
          }
        }
      } catch {
        // If JSON parsing fails, fall back to text
        const text = await res.text().catch(() => "");
        if (text) {
          errorMessage += ` ${text}`;
        }
      }
    } else {
      const text = await res.text().catch(() => "");
      if (text) {
        errorMessage += ` ${text}`;
      }
    }
    
    throw new Error(errorMessage);
  }
  // 204 No Content - return null immediately
  if (res.status === 204) {
    return null;
  }
  // Some endpoints may return no JSON (e.g., DELETE)
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  return null;
}

export async function apiGet<T = unknown>(path: string): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  console.log("[apiGet] GET", url);

  const res = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  return handleResponse(res, path) as Promise<T>;
}

export async function apiPost<T = unknown, B = unknown>(
  path: string,
  body: B | FormData
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  console.log("[apiPost] POST", url, body);

  const headers: HeadersInit = {
    ...getAuthHeaders(),
  };

  // Only set Content-Type for non-FormData bodies
  // FormData will set Content-Type with boundary automatically
  if (!(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: body instanceof FormData ? body : JSON.stringify(body),
  });

  return handleResponse(res, path) as Promise<T>;
}

export async function apiPut<T = unknown, B = unknown>(
  path: string,
  body: B
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  console.log("[apiPut] PUT", url, body);

  const headers = {
    "Content-Type": "application/json",
    ...getAuthHeaders(),
  };

  const res = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });

  return handleResponse(res, path) as Promise<T>;
}

export async function apiPatch<T = unknown, B = unknown>(
  path: string,
  body: B
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  console.log("[apiPatch] PATCH", url, body);

  const headers = {
    "Content-Type": "application/json",
    ...getAuthHeaders(),
  };

  const res = await fetch(url, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });

  return handleResponse(res, path) as Promise<T>;
}

export async function apiDelete<T = unknown>(path: string): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  console.log("[apiDelete] DELETE", url);

  const res = await fetch(url, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  return handleResponse(res, path) as Promise<T>;
}

export async function apiDownloadFile(
  path: string,
  filename: string
): Promise<void> {
  const url = `${API_BASE_URL}${path}`;
  console.log("[apiDownloadFile] GET", url);

  const res = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Failed to download file: ${res.status} ${res.statusText}`);
  }

  const blob = await res.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
}
