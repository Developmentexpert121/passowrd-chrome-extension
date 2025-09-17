import { useState } from "react";

import CredentialsTab from "./CredentialsTab";
import AdminsTab from "./AdminsTab";
import UsersTab from "./UsersTab";
import ManageUsersTab from "./ManageUsersTab";
import { clearStorage } from "../utils/api";

interface DashboardProps {
  user: { id: number; role: "super_admin" | "admin" | "user"; team?: string };
  onLogout: () => void;
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState("credentials");

  const tabs = [
    { key: "credentials", label: "Credentials" },
    ...(user.role === "super_admin"
      ? [{ key: "admins", label: "Admins" }]
      : []),
    ...(user.role === "super_admin" || user.role === "admin"
      ? [{ key: "users", label: "Users" }]
      : []),
    ...(user.role === "super_admin"
      ? [{ key: "manageusers", label: "Manage Users" }]
      : []),
  ];

  const handleLogout = async () => {
    await clearStorage();
    onLogout();
  };

  return (
    <div className="bg-gray-50 p-4 w-96 min-h-screen text-gray-900">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-xl">
          Dashboard (Role: {user.role}, ID: {user.id})
        </h3>
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded-md text-white transition-colors"
        >
          Logout
        </button>
      </div>
      <div className="flex mb-4 border-gray-300 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`px-4 py-2 border-r border-gray-300 last:border-r-0 transition-colors ${
              activeTab === t.key
                ? "bg-primary-500 text-white border-b-0"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="bg-white shadow-sm p-4 rounded-md">
        {activeTab === "credentials" && <CredentialsTab user={user} />}
        {activeTab === "admins" && <AdminsTab />}
        {activeTab === "users" && <UsersTab user={user} />}
        {activeTab === "manageusers" && <ManageUsersTab />}
      </div>
    </div>
  );
}
