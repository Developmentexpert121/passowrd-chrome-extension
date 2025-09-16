import { useState } from "react";
import { signupUser } from "../utils/api";

export default function AddUserTab() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [team, setTeam] = useState("designing");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await signupUser({ email, password, role, team });
    setMessage(res.message || res.error);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <select value={role} onChange={(e) => setRole(e.target.value)}>
        <option value="super_admin">Super Admin</option>
        <option value="admin">Admin</option>
        <option value="user">User</option>
      </select>
      <select value={team} onChange={(e) => setTeam(e.target.value)}>
        <option value="designing">Designing</option>
        <option value="marketing">Marketing</option>
        <option value="php">PHP</option>
        <option value="fullstack">Fullstack</option>
      </select>
      <button type="submit">Add User</button>
      {message && <p>{message}</p>}
    </form>
  );
}
