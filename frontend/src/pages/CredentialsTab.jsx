import { useEffect, useState } from "react";
import { fetchCredentials } from "../utils/api";

export default function CredentialsTab({ user }) {
  const [creds, setCreds] = useState([]);

  useEffect(() => {
    fetchCredentials().then(setCreds);
  }, []);

  return (
    <div>
      {user.role === "super_admin" && <button>Add New Credential</button>}
      <ul>
        {creds.map((c) => (
          <li key={c.id}>
            {c.email} ({c.website || "N/A"})
          </li>
        ))}
      </ul>
    </div>
  );
}
