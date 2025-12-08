export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

async function handleResponse(res: Response, path: string) {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Request to ${path} failed: ${res.status} ${res.statusText} ${text}`);
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
  });

  return handleResponse(res, path) as Promise<T>;
}

export async function apiPost<T = unknown, B = unknown>(
  path: string,
  body: B
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  console.log("[apiPost] POST", url, body);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return handleResponse(res, path) as Promise<T>;
}

export async function apiPut<T = unknown, B = unknown>(
  path: string,
  body: B
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  console.log("[apiPut] PUT", url, body);

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return handleResponse(res, path) as Promise<T>;
}

export async function apiDelete<T = unknown>(path: string): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  console.log("[apiDelete] DELETE", url);

  const res = await fetch(url, {
    method: "DELETE",
  });

  return handleResponse(res, path) as Promise<T>;
}
