import { useEffect, useState } from "react";
import { fetchAdmins } from "../utils/api";

export default function AdminsTab() {
  const [admins, setAdmins] = useState([]);

  useEffect(() => {
    fetchAdmins().then(setAdmins);
  }, []);

  return (
    <ul>
      {admins.map((a) => (
        <li key={a.id}>
          {a.email} — Team: {a.team}
        </li>
      ))}
    </ul>
  );
}
