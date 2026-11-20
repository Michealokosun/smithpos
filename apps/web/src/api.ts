export type Role = "administrator" | "manager" | "cashier";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  mustChangePassword: boolean;
}

export interface StaffUser extends AuthUser {
  active: boolean;
  createdAt: string;
}

interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

let accessToken: string | null = null;
let refreshPromise: Promise<AuthUser | null> | null = null;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function setAccessToken(token: string | null) {
  accessToken = token;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      message = `Request failed (${response.status})`;
    }
    throw new ApiError(message, response.status);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

async function send<T>(
  path: string,
  init: RequestInit = {},
  retryAfterRefresh = true,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const response = await fetch(path, {
    ...init,
    headers,
    credentials: "include",
  });
  if (
    response.status === 401 &&
    retryAfterRefresh &&
    accessToken &&
    !path.startsWith("/api/auth/")
  ) {
    const refreshed = await refreshSession();
    if (refreshed) return send<T>(path, init, false);
  }
  return parseResponse<T>(response);
}

export function refreshSession(): Promise<AuthUser | null> {
  if (refreshPromise) return refreshPromise;

  const pending = (async () => {
    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    if (response.status === 401) {
      setAccessToken(null);
      return null;
    }
    const session = await parseResponse<AuthResponse>(response);
    setAccessToken(session.accessToken);
    return session.user;
  })();
  refreshPromise = pending;
  return pending.finally(() => {
    if (refreshPromise === pending) refreshPromise = null;
  });
}

export async function login(
  email: string,
  password: string,
): Promise<AuthUser> {
  const session = await send<AuthResponse>(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
    false,
  );
  setAccessToken(session.accessToken);
  return session.user;
}

export async function logout(): Promise<void> {
  await send<void>("/api/auth/logout", { method: "POST" }, false);
  setAccessToken(null);
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await send("/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function listUsers(): Promise<StaffUser[]> {
  const response = await send<{ users: StaffUser[] }>("/api/users");
  return response.users;
}

export async function createStaffUser(input: {
  name: string;
  email: string;
  password: string;
  role: "manager" | "cashier";
}): Promise<StaffUser> {
  const response = await send<{ user: StaffUser }>("/api/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.user;
}
