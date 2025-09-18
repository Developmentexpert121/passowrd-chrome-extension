import { useEffect, useState } from "react";
import { fetchAdmins, fetchCredentialsForUser, removeUserAccessFromCredential } from "../utils/api";
import { FiChevronDown, FiChevronUp, FiX, FiMail, FiGlobe } from "react-icons/fi";

interface AdminsTabProps {
  user: { role: "super_admin" | "admin" | "user" };
}

export default function AdminsTab({ user }: AdminsTabProps) {
  const [admins, setAdmins] = useState<any[]>([]);
  const [credentials, setCredentials] = useState<{ [userId: number]: any[] }>({});
  const [expanded, setExpanded] = useState<{ [userId: number]: boolean }>({});

  useEffect(() => {
    fetchAdmins().then(setAdmins);
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
    <div className="space-y-2">
      {admins.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No admins found.</p>
      ) : (
        admins.map((a) => (
          <div
            key={a.id}
            className="bg-gray-50 dark:bg-gray-700 p-3 border border-gray-200 dark:border-gray-600 rounded-md"
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">{a.email}</p>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Team: {a.team}
                </p>
              </div>
              {(user.role === "super_admin" || user.role === "admin") && (
                <button
                  onClick={() => toggleExpanded(a.id)}
                  className="flex items-center gap-1 text-blue-500 hover:text-blue-600"
                >
                  {expanded[a.id] ? <FiChevronUp /> : <FiChevronDown />}
                  Credentials
                </button>
              )}
            </div>
            {expanded[a.id] && (
              <div className="mt-3 space-y-2">
                {credentials[a.id]?.length === 0 ? (
                  <p className="text-gray-500 text-sm">No credentials assigned.</p>
                ) : (
                  credentials[a.id]?.map((c) => (
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
                        onClick={() => handleRemoveAccess(c.id, a.id)}
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
