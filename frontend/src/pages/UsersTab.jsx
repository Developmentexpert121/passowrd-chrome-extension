import { useEffect, useState } from "react";
import { fetchUsers } from "../utils/api";

export default function UsersTab({ user }) {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchUsers().then((allUsers) => {
      if (user.role === "admin") {
        setUsers(allUsers.filter((u) => u.team === user.team));
      } else if (user.role === "super_admin") {
        setUsers(allUsers.filter((u) => u.role === "user"));
      }
    });
  }, []);

  return (
    <ul>
      {users.map((u) => (
        <li key={u.id}>
          {u.email} — Role: {u.role}
        </li>
      ))}
    </ul>
  );
}
