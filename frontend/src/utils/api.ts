const BASE_URL = "http://127.0.0.1:8000/api";

// ---------------- TYPES ----------------
export interface LoginResponse {
  access: string;
  refresh: string;
  role: "super_admin" | "admin" | "user";
  id: number;
  message?: string;
  error?: string;
}

export interface UserData {
  email: string;
  password: string;
  role: "super_admin" | "admin" | "user";
  team: "designing" | "marketing" | "php" | "fullstack";
}

// ---------------- STORAGE HELPER ----------------
const storage =
  typeof chrome !== "undefined" && chrome.storage
    ? chrome.storage.local
    : {
        get: (keys: string[], cb: (items: any) => void) => {
          const result: any = {};
          keys.forEach((k) => {
            const value = localStorage.getItem(k);
            result[k] = value ? JSON.parse(value) : null;
          });
          cb(result);
        },
        set: (items: any, cb?: () => void) => {
          Object.keys(items).forEach((k) => {
            localStorage.setItem(k, JSON.stringify(items[k]));
          });
          if (cb) cb();
        },
      };

// ---------------- LOGIN ----------------
export const loginUser = async (
  email: string,
  password: string
): Promise<LoginResponse> => {
  const res = await fetch(`${BASE_URL}/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = (await res.json()) as LoginResponse;

  if (res.ok) {
    await new Promise<void>((resolve) =>
      storage.set(
        {
          accessToken: data.access,
          refreshToken: data.refresh,
          userRole: data.role,
          userId: data.id,
        },
        () => resolve()
      )
    );
  }

  return data;
};

// ---------------- FETCH WITH TOKEN ----------------
export const fetchWithToken = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  return new Promise((resolve) => {
    storage.get(
      ["accessToken"],
      async ({ accessToken }: { accessToken: string }) => {
        const res = await fetch(`${BASE_URL}${endpoint}`, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            Authorization: accessToken ? `Bearer ${accessToken}` : "",
            ...(options.headers || {}),
          },
        });
        const data = await res.json();
        resolve(data as T);
      }
    );
  });
};

// ---------------- API CALLS ----------------
export const fetchCredentials = () => fetchWithToken<any[]>("/credentials/");
export const fetchUsers = () => fetchWithToken<any[]>("/users/");
export const fetchAdmins = () => fetchWithToken<any[]>("/users/?role=admin");
export const signupUser = (userData: UserData) =>
  fetchWithToken<{ message?: string; error?: string }>("/signup/", {
    method: "POST",
    body: JSON.stringify(userData),
  });

// ---------------- OPTIONAL: helper to clear storage ----------------
export const clearStorage = () =>
  new Promise<void>((resolve) =>
    storage.set(
      { accessToken: null, refreshToken: null, userRole: null, userId: null },
      () => resolve()
    )
  );
