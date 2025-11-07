import sodium from 'libsodium-wrappers';

const BASE_URL = "https://passowrd-chrome-extension.onrender.com/api";

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
  team?: string;
  team_id?: string;
  public_key?: string;
  encrypted_private_key?: string;
  kdf?: string;
  kdf_salt?: string;
  devices?: any[];
}

export interface CredentialData {
  owner_id: string;
  title: string;
  meta: Record<string, any>;
  cipher_algo: string;
  ciphertext: string;
  acl: any[];
  assigned_to_team_ids: string[];
  password?: string;
}

export interface TeamData {
  name: string;
  admins: string[];
  members: string[];
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

    // Decrypt private key and store it
    try {
      await sodium.ready;
      const userRes = await fetch(`${BASE_URL}/me/`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.access}`,
        },
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        console.log("User data from /me/:", userData);
        if (userData.encrypted_private_key && userData.kdf_salt && userData.kdf_nonce) {
          console.log("Decrypting private key...");
          const salt = sodium.from_hex(userData.kdf_salt);
          const encKey = await deriveEncryptionKey(password, salt);
          const encrypted = sodium.from_hex(userData.encrypted_private_key);
          const nonce = sodium.from_hex(userData.kdf_nonce);
          const privateKey = await decryptPrivateKey(encrypted, nonce, encKey);
          console.log("Private key decrypted, storing:", sodium.to_hex(privateKey).substring(0, 10) + "...");
          storage.set({ privateKey: sodium.to_hex(privateKey) }, () => {
            console.log("Private key stored in storage.");
          });
        } else {
          console.log("No encrypted private key in user data.");
        }
      } else {
        console.log("Failed to fetch /me/, status:", userRes.status);
      }
    } catch (error) {
      console.error("Failed to decrypt private key:", error);
    }
  }

  return data;
};

// ---------------- REGISTER ----------------
export const registerUser = async (
  userData: UserData
): Promise<{
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
}> => {
  // Generate keypair and encrypt private key
  await sodium.ready;
  const { publicKey, privateKey } = await generateUserKeypair();
  const salt = sodium.randombytes_buf(32);
  const encKey = await deriveEncryptionKey(userData.password, salt);
  const { encrypted, nonce } = await encryptPrivateKey(privateKey, encKey);

  const payload = {
    ...userData,
    public_key: sodium.to_hex(publicKey),
    encrypted_private_key: sodium.to_hex(encrypted),
    kdf_salt: sodium.to_hex(salt),
    kdf_nonce: sodium.to_hex(nonce),
  };

  const res = await fetch(`${BASE_URL}/register/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (res.ok) {
    return { message: data.message || "User registered successfully" };
  } else {
    return { error: data.error || "Failed to register user" };
  }
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

        // 🛡️ Handle empty or non-JSON responses safely
        const text = await res.text();
        let data: any = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch (err) {
          console.warn("Failed to parse JSON:", err, "Raw response:", text);
        }

        resolve(data as T);
      }
    );
  });
};


// ---------------- API CALLS ----------------
export const fetchCredentials = async () => {
  const creds = await fetchWithToken<any[]>("/credentials/");
  await sodium.ready;
  for (const cred of creds) {
    if (cred.cipher_algo === 'xchacha20-poly1305' && cred.acl && cred.ciphertext) {
      // Decrypt
      const userId = await new Promise<string>((resolve) => {
        storage.get(["userId"], ({ userId }: { userId: number }) => {
          resolve(userId.toString());
        });
      });
      const privateKeyHex = await new Promise<string>((resolve) => {
        storage.get(["privateKey"], ({ privateKey }: { privateKey: string }) => {
          resolve(privateKey);
        });
      });
      if (privateKeyHex) {
        console.log("=== fetchCredentials Debug ===");
        console.log("Retrieved privateKeyHex:", privateKeyHex.substring(0, 16) + "...");
        const privateKey = sodium.from_hex(privateKeyHex);
        console.log("Converted privateKey length:", privateKey.length);

        // Find the acl entry for userId
        const aclEntry = cred.acl.find((entry: any) => entry.grantee_user_id === userId);
        console.log({ userId });
        console.log({ aclEntry });

        if (aclEntry) {
          console.log("Found ACL entry for user:", userId);
          console.log("ACL entry:", {
            grantee_user_id: aclEntry.grantee_user_id,
            wrap_algo: aclEntry.wrap_algo,
            key_version: aclEntry.key_version,
            has_enc_dek: !!aclEntry.enc_dek,
            has_ephemeral_pub: !!aclEntry.ephemeral_pub,
            has_wrap_nonce: !!aclEntry.wrap_nonce
          });

          // Check if we have all required encryption data
          if (!aclEntry.enc_dek || !aclEntry.ephemeral_pub || !aclEntry.wrap_nonce) {
            console.log("Missing encryption data for user", userId, "in credential", cred.id);
            console.log("This is expected for auto-added super admins. Skipping credential access.");
            // Skip this credential for now - super admin needs to access it first to generate encryption data
            continue;
          }

          try {
            const wrappedDEK = sodium.from_base64(aclEntry.enc_dek);
            const ephemeralPub = sodium.from_base64(aclEntry.ephemeral_pub);
            const wrapNonce = sodium.from_base64(aclEntry.wrap_nonce);

            console.log("Decoded ACL data:");
            console.log("wrappedDEK length:", wrappedDEK.length);
            console.log("ephemeralPub length:", ephemeralPub.length);
            console.log("wrapNonce length:", wrapNonce.length);

            const dek = await unwrapDEK(wrappedDEK, ephemeralPub, wrapNonce, privateKey);
            // Now decrypt the ciphertext
            const combined = sodium.from_base64(cred.ciphertext);
            const nonce = combined.slice(0, sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
            const ciphertext = combined.slice(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
            const password = await decryptCredential(ciphertext, nonce, dek);
            cred.password = password;
          } catch (error) {
            console.error("Failed to decrypt credential", cred.id, "for user", userId, ":", error);
            // Continue to next credential instead of failing completely
            continue;
          }
        } else {
          return []
        }
      }
    }
  }
  return creds;
};
export const fetchAllUsers = () => fetchWithToken<any[]>("/users/");
export const fetchTeams = () => fetchWithToken<any[]>("/teams/");
export const fetchUserPubkey = (userId: string) => fetchWithToken<{ public_key: string }>(`/users/${userId}/pubkey/`);

export const fetchAdmins = () => fetchWithToken<any[]>("/users/?role=admin");
export const fetchUsers = () => fetchWithToken<any[]>("/users/?role=user");
export const fetchCredentialsForUser = (userId: string | number) => fetchWithToken<any[]>(`/users/${userId}/credentials/`);
export const fetchUsersForCredential = (credentialId: string | number) => fetchWithToken<any[]>(`/credentials/${credentialId}/users/`);
export const removeUserAccessFromCredential = (credentialId: string | number, userId: string | number) =>
  fetchWithToken<{ message?: string; error?: string }>(`/credentials/${credentialId}/revoke/`, {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
  });
export const addUserAccessToCredential = async (credentialId: string | number, userId: string | number) => {
  console.log("=====Add User Access To Credential=====");
  console.log("Adding access for user:", userId, "to credential:", credentialId);

  // Use the proper shareCredential function that handles key wrapping
  return await shareCredential(credentialId.toString(), { user_id: userId });
}
export const signupUser = registerUser; // alias
export const exportUsers = () => fetchWithToken<any[]>("/users/export/");

export const createCredential = async (credentialData: CredentialData) => {
  // Encrypt the password if provided

  console.log("create credential hit")
  if (credentialData.password) {
    await sodium.ready;
    const dek = await generateDEK();
    const { ciphertext, nonce } = await encryptCredential(credentialData.password, dek);
    // Combine nonce and ciphertext
    const combined = new Uint8Array(nonce.length + ciphertext.length);
    combined.set(nonce);
    combined.set(ciphertext, nonce.length);
    const ciphertextB64 = sodium.to_base64(combined);

    // Get user info
    const userId = await new Promise<string>((resolve) => {
      storage.get(["userId"], ({ userId }: { userId: number }) => {
        resolve(userId.toString());
      });
    });
    const privateKeyHex = await new Promise<string>((resolve) => {
      storage.get(["privateKey"], ({ privateKey }: { privateKey: string }) => {
        resolve(privateKey);
      });
    });
    if (!privateKeyHex || typeof privateKeyHex !== 'string') {
      console.log("Private key not available. Please log in again.")
      return { error: "Private key not available. Please log in again." };
    }
    const privateKey = sodium.from_hex(privateKeyHex);
    const pubkeyRes = await fetchUserPubkey(userId);
    const recipientPubKey = sodium.from_hex(pubkeyRes.public_key);

    const { wrappedDEK, ephemeralPub, nonce: wrapNonce } = await wrapDEK(dek, recipientPubKey, privateKey);

    const acl = [{
      grantee_user_id: userId,
      enc_dek: sodium.to_base64(wrappedDEK),
      wrap_algo: 'ecdh-x25519',
      key_version: 'v1',
      granted_by: userId,
      granted_at: new Date().toISOString(),
      ephemeral_pub: sodium.to_base64(ephemeralPub),
      wrap_nonce: sodium.to_base64(wrapNonce)
    }];

    const payload = {
      title: credentialData.title,
      meta: credentialData.meta,
      cipher_algo: 'xchacha20-poly1305',
      ciphertext: ciphertextB64,
      acl: acl,
      assigned_to_team_ids: credentialData.assigned_to_team_ids || []
    };

    return fetchWithToken<{ message?: string; error?: string }>("/credentials/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } else {
    return fetchWithToken<{ message?: string; error?: string }>("/credentials/", {
      method: "POST",
      body: JSON.stringify(credentialData),
    });
  }
};

export const addCredential = createCredential; // alias

export const shareCredential = async (credentialId: string, shareData: any) => {
  console.log("=== shareCredential Debug ===");
  console.log("Sharing credential:", credentialId, "with data:", shareData);

  try {
    await sodium.ready;

    // First, get the current credential to access the ACL
    const credential = await fetchWithToken<any>(`/credentials/${credentialId}/`);

    if (!credential || !credential.acl) {
      console.error("Credential not found or has no ACL");
      return { error: "Credential not found or has no ACL" };
    }

    console.log("Retrieved credential:", credential);

    // Get the current user's info and private key
    const currentUserId = await new Promise<string>((resolve) => {
      storage.get(["userId"], ({ userId }: { userId: number }) => {
        resolve(userId.toString());
      });
    });

    const currentUserRole = await new Promise<string>((resolve) => {
      storage.get(["userRole"], ({ userRole }: { userRole: string }) => {
        resolve(userRole);
      });
    });

    const privateKeyHex = await new Promise<string>((resolve) => {
      storage.get(["privateKey"], ({ privateKey }: { privateKey: string }) => {
        resolve(privateKey);
      });
    });

    if (!privateKeyHex) {
      console.error("Private key not available for sharing");
      return { error: "Private key not available. Please log in again." };
    }

    const privateKey = sodium.from_hex(privateKeyHex);

    // Check if current user has permission to share (admin or super_admin)
    if (!['admin', 'super_admin'].includes(currentUserRole)) {
      console.error("User does not have permission to share credentials. Role:", currentUserRole);
      return { error: "Insufficient permissions. Only admins and super admins can share credentials." };
    }

    console.log("User has permission to share. Role:", currentUserRole);

    // Find the current user's ACL entry to get their wrapped DEK
    const currentUserAclEntry = credential.acl.find((entry: any) =>
      entry.grantee_user_id === currentUserId && entry.enc_dek && entry.ephemeral_pub && entry.wrap_nonce
    );

    if (!currentUserAclEntry) {
      console.error("Current user does not have access to this credential or missing encryption data");
      return { error: "You don't have access to this credential or it's missing encryption data." };
    }

    console.log("Found current user's ACL entry:", currentUserAclEntry);

    // Unwrap the current user's DEK
    const wrappedDEK = sodium.from_base64(currentUserAclEntry.enc_dek);
    const ephemeralPub = sodium.from_base64(currentUserAclEntry.ephemeral_pub);
    const wrapNonce = sodium.from_base64(currentUserAclEntry.wrap_nonce);

    const originalDek = await unwrapDEK(wrappedDEK, ephemeralPub, wrapNonce, privateKey);
    console.log("Successfully unwrapped current user's DEK, length:", originalDek.length);

    // Get public keys for all users being shared with
    const userIds = Array.isArray(shareData.user_id) ? shareData.user_id : [shareData.user_id];
    console.log("Users to share with:", userIds);

    const updatedAcl = [...credential.acl];

    for (const userId of userIds) {
      console.log("Processing user:", userId);

      // Get the user's public key
      const pubkeyRes = await fetchUserPubkey(userId.toString());
      const recipientPubKey = sodium.from_hex(pubkeyRes.public_key);
      console.log("Retrieved public key for user", userId, "length:", recipientPubKey.length);

      // Wrap the DEK for this recipient
      const { wrappedDEK: newWrappedDEK, ephemeralPub: newEphemeralPub, nonce: newWrapNonce } =
        await wrapDEK(originalDek, recipientPubKey, privateKey);

      console.log("Generated new wrapped DEK for user", userId);

      // Update or add ACL entry for this user
      const existingEntryIndex = updatedAcl.findIndex((entry: any) => entry.grantee_user_id === userId.toString());

      const newAclEntry = {
        grantee_user_id: userId.toString(),
        enc_dek: sodium.to_base64(newWrappedDEK),
        wrap_algo: 'ecdh-x25519',
        key_version: 'v1',
        granted_by: currentUserId,
        granted_at: new Date().toISOString(),
        ephemeral_pub: sodium.to_base64(newEphemeralPub),
        wrap_nonce: sodium.to_base64(newWrapNonce)
      };

      if (existingEntryIndex >= 0) {
        updatedAcl[existingEntryIndex] = newAclEntry;
        console.log("Updated existing ACL entry for user", userId);
      } else {
        updatedAcl.push(newAclEntry);
        console.log("Added new ACL entry for user", userId);
      }
    }

    console.log("Updated ACL:", updatedAcl);

    // Update the credential with the new ACL
    const updateResult = await fetchWithToken<{ message?: string; error?: string }>(`/credentials/${credentialId}/`, {
      method: "PATCH",
      body: JSON.stringify({
        acl: updatedAcl
      }),
    });

    console.log("Share operation completed:", updateResult);
    return updateResult;

  } catch (error) {
    console.error("Error in shareCredential:", error);
    return { error: "Failed to share credential: " + error };
  }
};

export const revokeCredential = (credentialId: string, revokeData: any) =>
  fetchWithToken<{ message?: string; error?: string }>(`/credentials/${credentialId}/revoke/`, {
    method: "POST",
    body: JSON.stringify(revokeData),
  });

export const deleteCredential = (credentialId: string) =>
  fetchWithToken<{ message?: string; error?: string }>(`/credentials/${credentialId}/`, {
    method: "DELETE",
  });

export const updateCredential = (
  credentialId: string,
  credentialData: Partial<CredentialData>
) =>
  fetchWithToken<{ message?: string; error?: string }>(`/credentials/${credentialId}/`, {
    method: "PATCH",
    body: JSON.stringify(credentialData),
  });

export const createTeam = (teamData: TeamData) =>
  fetchWithToken<{ message?: string; error?: string }>("/teams/", {
    method: "POST",
    body: JSON.stringify(teamData),
  });

export const updateUser = async (
  userId: number,
  userData: Partial<UserData>
): Promise<{
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
}> => {
  const res = await fetch(`${BASE_URL}/users/${userId}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: await getAuthHeader(),
    },
    body: JSON.stringify(userData),
  });

  const data = await res.json();

  if (res.ok) {
    return { message: data.message || "User updated successfully" };
  } else {
    return { error: data.error || data.detail || "Failed to update user" };
  }
};

// ---------------- OPTIONAL: helper to clear storage ----------------
export const clearStorage = () =>
  new Promise<void>((resolve) =>
    storage.set(
      {
        accessToken: null,
        refreshToken: null,
        userRole: null,
        userId: null,
        userEmail: null,
      },
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
  email: string;
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
      // Store userEmail
      storage.set({ userEmail: userData.email }, () => { });
      resolve({ id: userData.id, role: userData.role, email: userData.email });
    });
  });
};

// ---------------- KEY MANAGEMENT ----------------
export const generateUserKeypair = async (): Promise<{ publicKey: Uint8Array; privateKey: Uint8Array }> => {
  await sodium.ready;
  const keyPair = sodium.crypto_box_keypair();
  return { publicKey: keyPair.publicKey, privateKey: keyPair.privateKey };
};

export const deriveEncryptionKey = async (password: string, salt: Uint8Array): Promise<Uint8Array> => {
  await sodium.ready;
  return sodium.crypto_generichash(32, sodium.from_string(password), salt);
};

export const encryptPrivateKey = async (privateKey: Uint8Array, encKey: Uint8Array): Promise<{ encrypted: Uint8Array; nonce: Uint8Array }> => {
  await sodium.ready;
  const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const encrypted = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(privateKey, null, null, nonce, encKey);
  return { encrypted, nonce };
};

export const decryptPrivateKey = async (encrypted: Uint8Array, nonce: Uint8Array, encKey: Uint8Array): Promise<Uint8Array> => {
  await sodium.ready;
  return sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(null, encrypted, null, nonce, encKey);
};

export const generateDEK = async (): Promise<Uint8Array> => {
  await sodium.ready;
  return sodium.randombytes_buf(32);
};

export const encryptCredential = async (plaintext: string, dek: Uint8Array): Promise<{ ciphertext: Uint8Array; nonce: Uint8Array }> => {
  await sodium.ready;
  const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(sodium.from_string(plaintext), null, null, nonce, dek);
  return { ciphertext, nonce };
};

export const decryptCredential = async (ciphertext: Uint8Array, nonce: Uint8Array, dek: Uint8Array): Promise<string> => {
  await sodium.ready;
  const plaintext = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(null, ciphertext, null, nonce, dek);
  return sodium.to_string(plaintext);
};

export const wrapDEK = async (dek: Uint8Array, recipientPubKey: Uint8Array, senderPrivKey: Uint8Array): Promise<{ wrappedDEK: Uint8Array; ephemeralPub: Uint8Array; nonce: Uint8Array }> => {
  await sodium.ready;

  console.log("=== wrapDEK Debug ===");
  console.log("dek length:", dek.length);
  console.log("recipientPubKey length:", recipientPubKey.length);
  console.log("senderPrivKey length:", senderPrivKey.length);

  const ephemeral = sodium.crypto_box_keypair();
  console.log("Generated ephemeral keypair");
  console.log("ephemeral.publicKey length:", ephemeral.publicKey.length);
  console.log("ephemeral.privateKey length:", ephemeral.privateKey.length);

  // Use ephemeral private key + recipient public key to derive shared secret
  console.log("Deriving shared secret...");
  const sharedSecret = sodium.crypto_scalarmult(ephemeral.privateKey, recipientPubKey);
  console.log("sharedSecret length:", sharedSecret.length);
  console.log("sharedSecret hex:", sodium.to_hex(sharedSecret).substring(0, 16) + "...");

  console.log("Deriving wrap key from shared secret...");
  const wrapKey = sodium.crypto_generichash(32, sharedSecret);
  console.log("wrapKey length:", wrapKey.length);
  console.log("wrapKey hex:", sodium.to_hex(wrapKey).substring(0, 16) + "...");

  const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  console.log("Generated nonce, length:", nonce.length);

  console.log("Encrypting DEK...");
  const wrappedDEK = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(dek, null, null, nonce, wrapKey);
  console.log("Encryption successful, wrappedDEK length:", wrappedDEK.length);

  return { wrappedDEK, ephemeralPub: ephemeral.publicKey, nonce };
};

export const unwrapDEK = async (wrappedDEK: Uint8Array, ephemeralPub: Uint8Array, nonce: Uint8Array, recipientPrivKey: Uint8Array): Promise<Uint8Array> => {
  await sodium.ready;

  console.log("=== unwrapDEK Debug ===");
  console.log("wrappedDEK length:", wrappedDEK.length);
  console.log("ephemeralPub length:", ephemeralPub.length);
  console.log("nonce length:", nonce.length);
  console.log("recipientPrivKey length:", recipientPrivKey.length);

  // Use recipient private key + ephemeral public key to derive the same shared secret
  console.log("Deriving shared secret...");
  const sharedSecret = sodium.crypto_scalarmult(recipientPrivKey, ephemeralPub);
  console.log("sharedSecret length:", sharedSecret.length);
  console.log("sharedSecret hex:", sodium.to_hex(sharedSecret).substring(0, 16) + "...");

  console.log("Deriving wrap key from shared secret...");
  const wrapKey = sodium.crypto_generichash(32, sharedSecret);
  console.log("wrapKey length:", wrapKey.length);
  console.log("wrapKey hex:", sodium.to_hex(wrapKey).substring(0, 16) + "...");

  console.log("Attempting decryption...");
  try {
    const decrypted = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(null, wrappedDEK, null, nonce, wrapKey);
    console.log("Decryption successful!");
    return decrypted;
  } catch (error) {
    console.error("Decryption failed in unwrapDEK:", error);
    console.error("Error details:", {
      wrappedDEK_hex: sodium.to_hex(wrappedDEK).substring(0, 32) + "...",
      ephemeralPub_hex: sodium.to_hex(ephemeralPub).substring(0, 32) + "...",
      nonce_hex: sodium.to_hex(nonce).substring(0, 32) + "...",
      recipientPrivKey_hex: sodium.to_hex(recipientPrivKey).substring(0, 32) + "...",
      wrapKey_hex: sodium.to_hex(wrapKey).substring(0, 32) + "..."
    });
    throw error;
  }
};
