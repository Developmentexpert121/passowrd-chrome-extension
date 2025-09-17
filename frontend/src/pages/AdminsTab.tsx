import { useEffect, useState } from "react";
import { fetchAdmins } from "../utils/api";

export default function AdminsTab() {
  const [admins, setAdmins] = useState<any[]>([]);

  useEffect(() => {
    fetchAdmins().then(setAdmins);
  }, []);

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
            <p className="font-medium">{a.email}</p>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Team: {a.team}
            </p>
          </div>
        ))
      )}
    </div>
  );
}
