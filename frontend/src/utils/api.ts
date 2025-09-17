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

export interface CredentialData {
  email: string;
  password: string;
  website?: string;
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

// ---------------- DELETE USER ----------------
export const deleteUser = async (
  userId: number
): Promise<{ message?: string; error?: string }> => {
  const res = await fetch(`${BASE_URL}/users/${userId}/`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: await getAuthHeader(),
    },
  });
  if (res.ok) {
    return { message: "User deleted successfully" };
  } else {
    const data = await res.json();
    return { error: data.error || "Failed to delete user" };
  }
};

// Helper to get Authorization header
async function getAuthHeader(): Promise<string> {
  return new Promise((resolve) => {
    storage.get(["accessToken"], ({ accessToken }: { accessToken: string }) => {
      resolve(accessToken ? `Bearer ${accessToken}` : "");
    });
  });
}

// ---------------- FETCH WITH TOKEN ----------------
export const fetchWithToken = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  return new Promise((resolve) => {
    storage.get(
      ["accessToken"],
      async ({ accessToken }: { accessToken: string }) => {
        let res = await fetch(`${BASE_URL}${endpoint}`, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            Authorization: accessToken ? `Bearer ${accessToken}` : "",
            ...(options.headers || {}),
          },
        });
        if (res.status === 401) {
          // Token expired, try refresh
          const refreshData = await refreshToken();
          if (refreshData && refreshData.access) {
            // Retry with new token
            res = await fetch(`${BASE_URL}${endpoint}`, {
              ...options,
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${refreshData.access}`,
                ...(options.headers || {}),
              },
            });
          }
        }
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
export const exportUsers = () => fetchWithToken<any[]>("/users/export_users/");
export const signupUser = (userData: UserData) =>
  fetchWithToken<{ message?: string; error?: string }>("/signup/", {
    method: "POST",
    body: JSON.stringify(userData),
  });
export const updateUser = (userId: number, userData: Partial<UserData>) =>
  fetchWithToken<{ message?: string; error?: string }>(`/users/${userId}/`, {
    method: "PATCH",
    body: JSON.stringify(userData),
  });
export const addCredential = (credentialData: CredentialData) =>
  fetchWithToken<{ message?: string; error?: string }>("/credentials/", {
    method: "POST",
    body: JSON.stringify(credentialData),
  });

// Assignment management
export const fetchUsersForCredential = (credentialId: number) =>
  fetchWithToken<any[]>(`/assignments/${credentialId}/users_for_credential/`);
export const addUserAccessToCredential = (
  credentialId: number,
  userId: number
) =>
  fetchWithToken<{ message?: string; error?: string }>(
    `/assignments/${credentialId}/add_user_access/`,
    {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    }
  );
export const removeUserAccessFromCredential = (
  credentialId: number,
  userId: number
) =>
  fetchWithToken<{ message?: string; error?: string }>(
    `/assignments/${credentialId}/remove_user_access/`,
    {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    }
  );

// ---------------- OPTIONAL: helper to clear storage ----------------
export const clearStorage = () =>
  new Promise<void>((resolve) =>
    storage.set(
      { accessToken: null, refreshToken: null, userRole: null, userId: null },
      () => resolve()
    )
  );

// ---------------- REFRESH TOKEN ----------------
export const refreshToken = async (): Promise<LoginResponse | null> => {
  return new Promise((resolve) => {
    storage.get(["refreshToken"], async ({ refreshToken }) => {
      if (!refreshToken) {
        resolve(null);
        return;
      }
      const res = await fetch(`${BASE_URL}/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: refreshToken }),
      });
      if (!res.ok) {
        resolve(null);
        return;
      }
      const data = (await res.json()) as LoginResponse;
      if (data.access) {
        await new Promise<void>((resolveStorage) =>
          storage.set({ accessToken: data.access }, () => resolveStorage())
        );
      }
      resolve(data);
    });
  });
};

// ---------------- VERIFY USER ----------------
export const verifyUser = async (): Promise<{
  id: number;
  role: "super_admin" | "admin" | "user";
} | null> => {
  return new Promise((resolve) => {
    storage.get(["accessToken"], async ({ accessToken }) => {
      if (!accessToken) {
        resolve(null);
        return;
      }
      // Try to get current user info
      let res = await fetch(`${BASE_URL}/me/`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (res.status === 401) {
        // Access token expired, try refresh
        const refreshData = await refreshToken();
        if (!refreshData || !refreshData.access) {
          resolve(null);
          return;
        }
        // Retry with new access token
        res = await fetch(`${BASE_URL}/me/`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${refreshData.access}`,
          },
        });
      }
      if (!res.ok) {
        resolve(null);
        return;
      }
      const userData = await res.json();
      resolve({ id: userData.id, role: userData.role });
    });
  });
};
