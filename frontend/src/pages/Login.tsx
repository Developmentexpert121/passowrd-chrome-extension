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
      const userInfoResponse = await fetch(
        "https://passowrd-chrome-extension.onrender.com/api/me/",
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.access}`,
          },
        }
      );
      const userInfo = await userInfoResponse.json();
      onLogin({ id: data.id, role: data.role, email: userInfo.email });
    } else {
      setError(data.error || "Login failed");
    }
  };

  return (
    <div className="bg-white shadow p-3 rounded w-60 border border-gray-200">
      <h3 className="mb-3 font-semibold text-lg text-gray-900 text-center">
        Login
      </h3>
      <form onSubmit={handleSubmit} className="flex flex-col space-y-2">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="bg-gray-50 px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 placeholder-gray-500 text-xs"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="bg-gray-50 px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 placeholder-gray-500 text-xs"
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 py-1.5 rounded w-full font-semibold text-white transition-colors text-xs"
        >
          Login
        </button>
        {error && <p className="text-red-600 text-xs text-center">{error}</p>}
      </form>
    </div>
  );
}
