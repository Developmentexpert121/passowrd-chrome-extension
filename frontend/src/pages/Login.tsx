import { useState, type FormEvent } from "react";
import { loginUser, type LoginResponse } from "../utils/api";

interface LoginProps {
  onLogin: (user: { id: number; role: string }) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const data: LoginResponse = await loginUser(email, password);
    if (data.access) {
      onLogin({ id: data.id, role: data.role });
    } else {
      setError(data.error || "Login failed");
    }
  };

  return (
    <div style={{ padding: 12, width: 300 }}>
      <h3>Login</h3>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: "100%", marginBottom: 6 }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: "100%", marginBottom: 6 }}
        />
        <button type="submit" style={{ width: "100%" }}>
          Login
        </button>
        {error && <p style={{ color: "red" }}>{error}</p>}
      </form>
    </div>
  );
}
