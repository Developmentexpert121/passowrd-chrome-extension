import { useEffect, useState } from "react";
import { fetchUsers } from "../utils/api";

interface UsersTabProps {
  user: { role: "super_admin" | "admin" | "user"; team?: string };
}

export default function UsersTab({ user }: UsersTabProps) {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchUsers().then((allUsers) => {
      if (user.role === "admin") {
        setUsers(allUsers.filter((u: any) => u.team === user.team));
      } else if (user.role === "super_admin") {
        setUsers(allUsers.filter((u: any) => u.role === "user"));
      }
    });
  }, []);

  return (
    <div className="space-y-2">
      {users.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No users found.</p>
      ) : (
        users.map((u) => (
          <div
            key={u.id}
            className="bg-gray-50 dark:bg-gray-700 p-3 border border-gray-200 dark:border-gray-600 rounded-md"
          >
            <p className="font-medium">{u.email}</p>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Role: {u.role}
            </p>
          </div>
        ))
      )}
    </div>
  );
}
