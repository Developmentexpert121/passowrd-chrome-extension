import { useState } from "react";

import CredentialsTab from "./CredentialsTab";
import AdminsTab from "./AdminsTab";
import UsersTab from "./UsersTab";
import ManageUsersTab from "./ManageUsersTab";
import { clearStorage } from "../utils/api";

interface DashboardProps {
  user: {
    id: number;
    role: "super_admin" | "admin" | "user";
    team?: string;
    email: string;
  };
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
    <div className="min-h-screen p-4 text-gray-900 bg-gray-50 dark:bg-gray-600 w-96 dark:text-gray-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold dark:text-gray-50">
          {user.email}
        </h3>
        <button
          onClick={handleLogout}
          className="px-3 py-1 text-white transition-colors bg-red-500 rounded-md cursor-pointer hover:bg-red-600"
        >
          Logout
        </button>
      </div>
      <div className="flex border-b border-gray-300">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`px-3.5 py-2 border-r border-gray-300 last:border-r-0 transition-colors ${
              activeTab === t.key
                ? "bg-primary-500 text-white border-b-0"
                : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-800 "
            }`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="p-4 bg-white shadow-sm dark:bg-gray-500 rounded-b-md">
        {activeTab === "credentials" && <CredentialsTab user={user} />}
        {activeTab === "admins" && <AdminsTab user={user} />}
        {activeTab === "users" && <UsersTab user={user} />}
        {activeTab === "manageusers" && <ManageUsersTab />}
      </div>
      {/* <footer className="flex justify-center mt-2 text-sm text-gray-400 dark:text-gray-300"
      >
        Developed by: Gurdeep Singh
      </footer> */}
    </div>
  );
}
