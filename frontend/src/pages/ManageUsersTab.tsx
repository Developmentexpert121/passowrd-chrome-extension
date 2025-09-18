import { useState, useEffect, type FormEvent } from "react";
import {
  signupUser,
  fetchUsers,
  deleteUser,
  updateUser,
  exportUsers,
} from "../utils/api";
import jsPDF from "jspdf";
import Papa from "papaparse";

type Role = "super_admin" | "admin" | "user";
type Team = "designing" | "marketing" | "php" | "fullstack";

export default function ManageUsersTab() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("user");
  const [team, setTeam] = useState<Team>("designing");
  const [message, setMessage] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [editingUser, setEditingUser] = useState<number | null>(null);
  const [editData, setEditData] = useState<{
    email: string;
    role: Role;
    team: Team;
    password: string;
  }>({
    email: "",
    role: "user",
    team: "designing",
    password: "",
  });

  useEffect(() => {
    fetchUsers().then((allUsers) => {
      setUsers(allUsers.filter((u: any) => u.role !== "super_admin"));
    });
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const res = await signupUser({ email, password, role, team });
    setMessage(res.message ?? res.error ?? "");
    if (res.message) {
      // Refresh list
      fetchUsers().then((allUsers) => {
        setUsers(allUsers.filter((u: any) => u.role !== "super_admin"));
      });
      // Clear form
      setEmail("");
      setPassword("");
      setRole("user");
      setTeam("designing");
    }
  };

  const handleDelete = async (userId: number) => {
    const res = await deleteUser(userId);
    if (res.message) {
      setUsers(users.filter((u) => u.id !== userId));
    } else {
      setMessage(res.error ?? "Error deleting user");
    }
  };

  const handleEdit = (user: any) => {
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
    const updatePayload: any = {
      email: editData.email,
      role: editData.role,
      team: editData.team,
    };
    if (editData.password.trim() !== "") {
      updatePayload.password = editData.password;
    }
    const res = await updateUser(editingUser, updatePayload);
    setMessage(res.message ?? res.error ?? "");
    if (res.message) {
      // Refresh list
      fetchUsers().then((allUsers) => {
        setUsers(allUsers.filter((u: any) => u.role !== "super_admin"));
      });
      setEditingUser(null);
      setEditData({
        email: "",
        role: "user",
        team: "designing",
        password: "",
      });
    }
  };

  const exportCSV = async () => {
    try {
      const data = await exportUsers();
      const csv = Papa.unparse(
        data.map(({ id, email, role, team }: any) => ({
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
    } catch (error) {
      setMessage("Failed to export CSV");
    }
  };

  const exportPDF = async () => {
    try {
      const data = await exportUsers();
      const doc = new jsPDF();
      doc.text("Users List", 10, 10);
      let y = 20;
      data.forEach((user: any) => {
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
    } catch (error) {
      setMessage("Failed to export PDF");
    }
  };

  return (
    <div className="space-y-6 text-gray-50">
      <div className="flex gap-2">
        <button
          onClick={exportCSV}
          className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded-md text-white"
        >
          Export CSV
        </button>
        <button
          onClick={exportPDF}
          className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-md text-white"
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
            className="bg-white dark:bg-gray-800 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 w-full"
          />
        </div>
        <div>
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-white dark:bg-gray-800 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 w-full"
          />
        </div>
        <div>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="bg-white dark:bg-gray-800 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 w-full"
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
            className="bg-white dark:bg-gray-800 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 w-full"
          >
            <option value="designing">Designing</option>
            <option value="marketing">Marketing</option>
            <option value="php">PHP</option>
            <option value="fullstack">Fullstack</option>
          </select>
        </div>
        <button
          type="submit"
          className="bg-primary-600 hover:bg-primary-700 px-4 py-2 rounded-md w-full text-white transition-colors"
        >
          Add User
        </button>
        {message && (
          <p
            className={`text-sm ${message.includes("success") || message.includes("User")
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
              }`}
          >
            {message}
          </p>
        )}
      </form>

      <div className="space-y-2">
        <h3 className="font-semibold text-lg">Users</h3>
        {users.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No users found.</p>
        ) : (
          users.map((u) => (
            <div
              key={u.id}
              className="bg-gray-50 dark:bg-gray-700 p-3 border border-gray-200 dark:border-gray-600 rounded-md"
            >
              {editingUser === u.id ? (
                <div className="space-y-2">
                  <input
                    placeholder="Email"
                    value={editData.email}
                    onChange={(e) =>
                      setEditData({ ...editData, email: e.target.value })
                    }
                    className="bg-white dark:bg-gray-800 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 w-full"
                  />
                  <select
                    value={editData.role}
                    onChange={(e) =>
                      setEditData({ ...editData, role: e.target.value as Role })
                    }
                    className="bg-white dark:bg-gray-800 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 w-full"
                  >
                    <option value="admin">Admin</option>
                    <option value="user">User</option>
                  </select>
                  <select
                    value={editData.team}
                    onChange={(e) =>
                      setEditData({ ...editData, team: e.target.value as Team })
                    }
                    className="bg-white dark:bg-gray-800 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 w-full"
                  >
                    <option value="designing">Designing</option>
                    <option value="marketing">Marketing</option>
                    <option value="php">PHP</option>
                    <option value="fullstack">Fullstack</option>
                  </select>
                  <input
                    placeholder="New Password (leave empty to keep current)"
                    type="password"
                    value={editData.password}
                    onChange={(e) =>
                      setEditData({ ...editData, password: e.target.value })
                    }
                    className="bg-white dark:bg-gray-800 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 w-full"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      className="bg-green-500 hover:bg-green-600 px-3 py-1 rounded-md text-white"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="bg-gray-500 hover:bg-gray-600 px-3 py-1 rounded-md text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{u.email}</p>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      Role: {u.role}, Team: {u.team}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(u)}
                      className="bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded-md text-white transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded-md text-white transition-colors"
                    >
                      Delete
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
