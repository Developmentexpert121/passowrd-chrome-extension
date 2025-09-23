import { useState, useEffect, type FormEvent } from "react";
import {
  signupUser,
  fetchAllUsers,
  deleteUser,
  updateUser,
  exportUsers,
} from "../utils/api";
import jsPDF from "jspdf";
import Papa from "papaparse";
import { BiEdit } from "react-icons/bi";
import { FaTrash } from "react-icons/fa";

type Role = "super_admin" | "admin" | "user";
type Team = "designing" | "marketing" | "php" | "fullstack" | "management" | "hr";

interface User {
  id: number;
  email: string;
  role: Role;
  team: string;
}

interface ApiResponse {
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
}

export default function ManageUsersTab() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("user");
  const [team, setTeam] = useState<Team>("management");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<number | null>(null);
  const [editData, setEditData] = useState<{
    email: string;
    role: Role;
    team: string;
    password: string;
  }>({
    email: "",
    role: "user",
    team: "designing",
    password: "",
  });

  useEffect(() => {
    fetchAllUsers().then((allUsers) => {
      setUsers(allUsers.filter((u: User) => u.role !== "super_admin"));
    });
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const res: ApiResponse = await signupUser({
        email,
        password,
        role,
        team,
      });
      console.log("Signup:", res);
      if (res.message) {
        setMessage(res.message);
        // Refresh list
        fetchAllUsers().then((allUsers) => {
          setUsers(allUsers.filter((u: User) => u.role !== "super_admin"));
        });
        // Clear form only on success
        setEmail("");
        setPassword("");
        setRole("user");
        setTeam("designing");
      } else if (res.error) {
        setError(res.error);
      } else if (res.errors) {
        // Handle field-specific errors like {"email": ["app user with this email already exists."]}
        const firstKey = Object.keys(res.errors)[0];
        const firstError = res.errors[firstKey]?.[0];
        if (firstError) {
          throw new Error(firstError);
        }
        setError(firstError || "Validation error occurred.");
      } else {
        setError("Unknown error occurred.");
      }
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : "An error occurred while adding user."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId: number) => {
    try {
      const res: ApiResponse = await deleteUser(userId);
      if (res.message) {
        setUsers(users.filter((u) => u.id !== userId));
        setMessage(res.message);
      } else if (res.error) {
        setMessage(res.error);
      } else {
        setMessage("Unknown error occurred while deleting user.");
      }
    } catch (error: unknown) {
      setMessage(
        error instanceof Error
          ? error.message
          : "An error occurred while deleting user."
      );
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user.id);
    setEditData({
      email: user.email,
      role: user.role,
      team: user.team,
      password: "",
    });
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditData({
      email: "",
      role: "user",
      team: "designing",
      password: "",
    });
  };

  const handleSaveEdit = async () => {
    if (editingUser === null) return;
    const updatePayload: Partial<User> & { password?: string } = {
      email: editData.email,
      role: editData.role,
      team: editData.team,
    };
    if (editData.password.trim() !== "") {
      updatePayload.password = editData.password;
    }
    try {
      const res: ApiResponse = await updateUser(editingUser, updatePayload);
      if (res.message) {
        setMessage(res.message);
        // Refresh list
        fetchAllUsers().then((allUsers) => {
          setUsers(allUsers.filter((u: User) => u.role !== "super_admin"));
        });
        setEditingUser(null);
        setEditData({
          email: "",
          role: "user",
          team: "designing",
          password: "",
        });
      } else if (res.error) {
        setMessage(res.error);
      } else {
        setMessage("Unknown error occurred while updating user.");
      }
    } catch (error: unknown) {
      setMessage(
        error instanceof Error
          ? error.message
          : "An error occurred while updating user."
      );
    }
  };

  const exportCSV = async () => {
    try {
      const data = await exportUsers();
      const csv = Papa.unparse(
        data.map(({ id, email, role, team }: User) => ({
          id,
          email,
          role,
          team,
        }))
      );
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "users.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setMessage("CSV exported successfully");
    } catch (error: unknown) {
      setMessage(
        error instanceof Error ? error.message : "Failed to export CSV"
      );
    }
  };

  const exportPDF = async () => {
    try {
      const data = await exportUsers();
      const doc = new jsPDF();
      doc.text("Users List", 10, 10);
      let y = 20;
      data.forEach((user: User) => {
        doc.text(
          `ID: ${user.id}, Email: ${user.email}, Role: ${user.role}, Team: ${user.team}`,
          10,
          y
        );
        y += 10;
        if (y > 280) {
          doc.addPage();
          y = 10;
        }
      });
      doc.save("users.pdf");
      setMessage("PDF exported successfully");
    } catch (error: unknown) {
      setMessage(
        error instanceof Error ? error.message : "Failed to export PDF"
      );
    }
  };

  return (
    <div className="space-y-6 text-gray-900 dark:text-gray-50">
      <div className="flex gap-2">
        <button
          onClick={exportCSV}
          className="px-4 py-2 text-white bg-green-500 rounded-md cursor-pointer hover:bg-green-600"
        >
          Export CSV
        </button>
        <button
          onClick={exportPDF}
          className="px-4 py-2 text-white bg-blue-500 rounded-md cursor-pointer hover:bg-blue-600"
        >
          Export PDF
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </select>
        </div>
        <div>
          <select
            value={team}
            onChange={(e) => setTeam(e.target.value as Team)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="management">Management</option>
            <option value="fullstack">Fullstack</option>
            <option value="php">PHP</option>
            <option value="designing">Designing</option>
            <option value="marketing">Marketing</option>
            <option value="hr">HR</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className={`cursor-pointer bg-primary-600 hover:bg-primary-700 px-4 py-2 rounded-md w-full text-white transition-colors ${loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
        >
          Add User
        </button>

        {error && (
          <p className={`text-sm ${"text-red-600 dark:text-red-400"}`}>
            {error}
          </p>
        )}
        {message && (
          <p className={`text-sm ${"text-green-600 dark:text-green-400"}`}>
            {message}
          </p>
        )}
        {loading && (
          <p className="text-sm text-blue-600 dark:text-blue-400">
            Adding user...
          </p>
        )}
      </form>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Users</h3>
        {users.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No users found.</p>
        ) : (
          users.map((u) => (
            <div
              key={u.id}
              className="p-3 border border-gray-200 rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
            >
              {editingUser === u.id ? (
                <div className="space-y-2">
                  <input
                    placeholder="Email"
                    value={editData.email}
                    onChange={(e) =>
                      setEditData({ ...editData, email: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <select
                    value={editData.role}
                    onChange={(e) =>
                      setEditData({ ...editData, role: e.target.value as Role })
                    }
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="admin">Admin</option>
                    <option value="user">User</option>
                  </select>
                  <select
                    value={editData.team}
                    onChange={(e) =>
                      setEditData({ ...editData, team: e.target.value as Team })
                    }
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="management">Management</option>
                    <option value="fullstack">Fullstack</option>
                    <option value="php">PHP</option>
                    <option value="designing">Designing</option>
                    <option value="marketing">Marketing</option>
                  </select>
                  <input
                    placeholder="New Password (leave empty to keep current)"
                    type="password"
                    value={editData.password}
                    onChange={(e) =>
                      setEditData({ ...editData, password: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      className="px-3 py-1 text-white bg-green-500 rounded-md cursor-pointer hover:bg-green-600"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1 text-white bg-gray-500 rounded-md cursor-pointer hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{u.email}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Role: {u.role}, Team: {u.team}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleEdit(u)}
                      className="px-3 py-1 text-white transition-colors bg-blue-500 rounded-md cursor-pointer hover:bg-blue-600"
                    >
                      <BiEdit />
                    </button>
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="px-3 py-1 text-white transition-colors bg-red-500 rounded-md cursor-pointer hover:bg-red-600"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
