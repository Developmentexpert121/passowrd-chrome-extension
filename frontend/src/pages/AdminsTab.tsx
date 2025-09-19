import { useEffect, useState } from "react";
import {
  fetchAdmins,
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

interface AdminsTabProps {
  user: { role: "super_admin" | "admin" | "user" };
}

export default function AdminsTab({ user }: AdminsTabProps) {
  const [admins, setAdmins] = useState<any[]>([]);
  const [credentials, setCredentials] = useState<{ [userId: number]: any[] }>(
    {}
  );
  const [expanded, setExpanded] = useState<{ [userId: number]: boolean }>({});

  useEffect(() => {
    fetchAdmins().then(setAdmins);
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
    <div className="space-y-2 text-gray-900 dark:text-gray-50">
      {admins.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No admins found.</p>
      ) : (
        admins.map((a) => (
          <div
            key={a.id}
            className="p-3 border border-gray-200 rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 "
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{a.email}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Team: {a.team}
                </p>
              </div>
              {(user.role === "super_admin" || user.role === "admin") && (
                <button
                  onClick={() => toggleExpanded(a.id)}
                  className="flex items-center gap-1 text-blue-500 cursor-pointer hover:text-blue-600"
                >
                  {expanded[a.id] ? <FiChevronUp /> : <FiChevronDown />}
                  Credentials
                </button>
              )}
            </div>
            {expanded[a.id] && (
              <div className="mt-3 space-y-2">
                {credentials[a.id]?.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No credentials assigned.
                  </p>
                ) : (
                  credentials[a.id]?.map((c) => (
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
                        onClick={() => handleRemoveAccess(c.id, a.id)}
                        className="flex items-center gap-1 px-2 py-1 text-sm text-white bg-red-500 rounded cursor-pointer hover:bg-red-600"
                      >
                        <FiX />
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
