import { useState, type FormEvent } from "react";
import { loginUser, type LoginResponse } from "../utils/api";

interface LoginProps {
  onLogin: (user: {
    id: number;
    role: "user" | "super_admin" | "admin";
    email: string;
  }) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const data: LoginResponse = await loginUser(email, password);
    if (data.access) {
      // Fetch full user info including email after login
      const userInfoResponse = await fetch("http://127.0.0.1:8000/api/me/", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.access}`,
        },
      });
      const userInfo = await userInfoResponse.json();
      onLogin({ id: data.id, role: data.role, email: userInfo.email });
    } else {
      setError(data.error || "Login failed");
    }
  };

  return (
    <div className="bg-gray-900 shadow-md p-4 rounded-md w-72 text-white">
      <h3 className="mb-4 font-semibold text-xl">Login</h3>
      <form onSubmit={handleSubmit} className="flex flex-col space-y-3">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="bg-gray-800 px-3 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="bg-gray-800 px-3 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-700 py-2 rounded-md w-full font-semibold transition-colors"
        >
          Login
        </button>
        {error && <p className="text-red-500">{error}</p>}
      </form>
    </div>
  );
}
