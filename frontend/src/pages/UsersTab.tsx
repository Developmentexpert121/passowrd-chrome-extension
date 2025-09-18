import { useEffect, useState } from "react";
import { fetchUsers, fetchCredentialsForUser, removeUserAccessFromCredential } from "../utils/api";
import { FiChevronDown, FiChevronUp, FiX, FiMail, FiGlobe } from "react-icons/fi";

interface UsersTabProps {
  user: { role: "super_admin" | "admin" | "user"; team?: string };
}

export default function UsersTab({ user }: UsersTabProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [credentials, setCredentials] = useState<{ [userId: number]: any[] }>({});
  const [expanded, setExpanded] = useState<{ [userId: number]: boolean }>({});

  useEffect(() => {
    fetchUsers().then((allUsers) => {
      if (user.role === "admin") {
        setUsers(allUsers.filter((u: any) => u.team === user.team));
      } else if (user.role === "super_admin") {
        setUsers(allUsers.filter((u: any) => u.role === "user"));
      }
    });
  }, []);

  const fetchCredentials = async (userId: number) => {
    const creds = await fetchCredentialsForUser(userId);
    setCredentials(prev => ({ ...prev, [userId]: creds }));
  };

  const toggleExpanded = (userId: number) => {
    setExpanded(prev => ({ ...prev, [userId]: !prev[userId] }));
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
    <div className="space-y-2 text-white">
      {users.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No users found.</p>
      ) : (
        users.map((u) => (
          <div
            key={u.id}
            className="bg-gray-50 dark:bg-gray-700 p-3 border border-gray-200 dark:border-gray-600 rounded-md"
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">{u.email}</p>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Role: {u.role}
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
                  <p className="text-gray-500 text-sm">No credentials assigned.</p>
                ) : (
                  credentials[u.id]?.map((c) => (
                    <div
                      key={c.id}
                      className="bg-white dark:bg-gray-800 p-2 rounded border flex justify-between items-center"
                    >
                      <div>
                        <p className="flex items-center gap-1 text-sm">
                          <FiGlobe /> {c.website || "N/A"}
                        </p>
                        <p className="flex items-center gap-1 font-medium text-sm">
                          <FiMail /> {c.email}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveAccess(c.id, u.id)}
                        className="flex items-center gap-1 bg-red-500 hover:bg-red-600 px-2 py-1 rounded text-white text-sm"
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
