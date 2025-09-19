import { useEffect, useState } from "react";
import {
  fetchUsers,
  fetchCredentialsForUser,
  removeUserAccessFromCredential,
} from "../utils/api";
import {
  FiChevronDown,
  FiChevronUp,
  FiX,
  FiMail,
  FiGlobe,
} from "react-icons/fi";

interface UsersTabProps {
  user: { role: "super_admin" | "admin" | "user"; team?: string };
}

interface User {
  id: number;
  email: string;
  role: "super_admin" | "admin" | "user";
  team: "designing" | "marketing" | "php" | "fullstack";
}

interface Credential {
  id: number;
  website?: string;
  email: string;
  password: string;
}

export default function UsersTab({ user }: UsersTabProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [credentials, setCredentials] = useState<{
    [userId: number]: Credential[];
  }>({});
  const [expanded, setExpanded] = useState<{ [userId: number]: boolean }>({});

  useEffect(() => {
    fetchUsers().then((allUsers) => {
      // Remove client-side filtering; backend already filters for admin
      setUsers(allUsers);
    });
  }, []);

  const fetchCredentials = async (userId: number) => {
    const creds = await fetchCredentialsForUser(userId);
    setCredentials((prev) => ({ ...prev, [userId]: creds }));
  };

  const toggleExpanded = (userId: number) => {
    setExpanded((prev) => ({ ...prev, [userId]: !prev[userId] }));
    if (!credentials[userId]) {
      fetchCredentials(userId);
    }
  };

  const handleRemoveAccess = async (credentialId: number, userId: number) => {
    await removeUserAccessFromCredential(credentialId, userId);
    // Refresh credentials
    fetchCredentials(userId);
  };

  return (
    <div className="space-y-2 text-gray-800 dark:text-gray-50">
      {users.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No users found.</p>
      ) : (
        users.map((u) => (
          <div
            key={u.id}
            className="p-3 border border-gray-200 rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{u.email}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Role: {u.role}, Team: {u.team}
                </p>
              </div>
              {(user.role === "super_admin" || user.role === "admin") && (
                <button
                  onClick={() => toggleExpanded(u.id)}
                  className="flex items-center gap-1 text-blue-500 hover:text-blue-600"
                >
                  {expanded[u.id] ? <FiChevronUp /> : <FiChevronDown />}
                  Credentials
                </button>
              )}
            </div>
            {expanded[u.id] && (
              <div className="mt-3 space-y-2">
                {credentials[u.id]?.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No credentials assigned.
                  </p>
                ) : (
                  credentials[u.id]?.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-2 bg-white border rounded dark:bg-gray-800"
                    >
                      <div>
                        <p className="flex items-center gap-1 text-sm">
                          <FiGlobe /> {c.website || "N/A"}
                        </p>
                        <p className="flex items-center gap-1 text-sm font-medium">
                          <FiMail /> {c.email}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveAccess(c.id, u.id)}
                        className="flex items-center gap-1 px-2 py-1 text-sm text-white bg-red-500 rounded hover:bg-red-600"
                      >
                        <FiX /> Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
