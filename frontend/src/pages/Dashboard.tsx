// @ts-nocheck
import { useState } from "react";
import CredentialsTab from "./CredentialsTab";
import AdminsTab from "./AdminsTab";
import UsersTab from "./UsersTab";
import AddUserTab from "./AddUserTab";

interface DashboardProps {
  user: { id: number; role: "super_admin" | "admin" | "user" };
}

export default function Dashboard({ user }: DashboardProps) {
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
      ? [{ key: "adduser", label: "Add User" }]
      : []),
  ];

  return (
    <div style={{ width: 400, padding: 12 }}>
      <h3>Dashboard ({user.role})</h3>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            style={{
              padding: "6px 12px",
              background: activeTab === t.key ? "#ccc" : "#eee",
            }}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div>
        {activeTab === "credentials" && <CredentialsTab user={user} />}
        {activeTab === "admins" && <AdminsTab />}
        {activeTab === "users" && <UsersTab user={user} />}
        {activeTab === "adduser" && <AddUserTab />}
      </div>
    </div>
  );
}
