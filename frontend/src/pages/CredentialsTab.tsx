import { useEffect, useState, type FormEvent } from "react";
import {
  fetchCredentials,
  addCredential,
  deleteCredential,
  updateCredential,
  fetchUsersForCredential,
  addUserAccessToCredential,
  removeUserAccessFromCredential,
  fetchUsers,
} from "../utils/api";

// icons
import {
  FiPlus,
  FiX,
  FiLock,
  FiMail,
  FiGlobe,
  FiUserPlus,
  FiUserX,
  FiTrash,
  FiEdit,
} from "react-icons/fi";
import { FaKey } from "react-icons/fa";
import { IoOpenOutline } from "react-icons/io5";

interface CredentialsTabProps {
  user: { role: "super_admin" | "admin" | "user" };
}

export default function CredentialsTab({ user }: CredentialsTabProps) {
  const [creds, setCreds] = useState<
    { id: number; email: string; password: string; website?: string }[]
  >([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    website: "",
  });
  const [selectedCredential, setSelectedCredential] = useState<number | null>(
    null
  );
  const [assignedUsers, setAssignedUsers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    email: "",
    password: "",
    website: "",
  });

  useEffect(() => {
    fetchCredentials().then(setCreds);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await addCredential(formData);
    const newCreds = await fetchCredentials();
    setCreds(newCreds);
    setShowForm(false);
    setFormData({ email: "", password: "", website: "" });
  };

  const handleFill = async (c: { email: string; password: string }) => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, {
        action: "fillCredentials",
        email: c.email,
        password: c.password,
      });
    }
  };

  const handleOpenDetails = async (credentialId: number) => {
    setSelectedCredential(credentialId);
    setShowDetails(true);
    const users = await fetchUsersForCredential(credentialId);
    setAssignedUsers(users);
    const all = await fetchUsers();
    setAllUsers(all);
  };

  const handleAddUserAccess = async (userId: number) => {
    if (selectedCredential) {
      await addUserAccessToCredential(selectedCredential, userId);
      const users = await fetchUsersForCredential(selectedCredential);
      setAssignedUsers(users);
    }
  };

  const handleRemoveUserAccess = async (userId: number) => {
    if (selectedCredential) {
      await removeUserAccessFromCredential(selectedCredential, userId);
      const users = await fetchUsersForCredential(selectedCredential);
      setAssignedUsers(users);
    }
  };

  const handleEdit = () => {
    const currentCred = creds.find(c => c.id === selectedCredential);
    if (currentCred) {
      setEditFormData({
        email: currentCred.email,
        password: currentCred.password,
        website: currentCred.website || "",
      });
      setIsEditing(true);
    }
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (selectedCredential) {
      await updateCredential(selectedCredential, editFormData);
      const newCreds = await fetchCredentials();
      setCreds(newCreds);
      setIsEditing(false);
    }
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditFormData({ email: "", password: "", website: "" });
  };

  return (
    <div className="space-y-6">
      {user.role === "super_admin" && (
        <>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 px-4 py-2 rounded-md text-white transition-colors"
          >
            {showForm ? <FiX /> : <FiPlus />}
            {showForm ? "Cancel" : "Add New Credential"}
          </button>

          {showForm && (
            <form
              onSubmit={handleSubmit}
              className="space-y-4 bg-gray-100 dark:bg-gray-700 p-4 rounded-md"
            >
              <div>
                <label className="block flex items-center gap-1 mb-1 font-medium text-sm">
                  <FiMail /> Email:
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                  className="bg-white dark:bg-gray-800 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 w-full"
                />
              </div>
              <div>
                <label className="block flex items-center gap-1 mb-1 font-medium text-sm">
                  <FiLock /> Password:
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  className="bg-white dark:bg-gray-800 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 w-full"
                />
              </div>
              <div>
                <label className="block flex items-center gap-1 mb-1 font-medium text-sm">
                  <FiGlobe /> Website:
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) =>
                    setFormData({ ...formData, website: e.target.value })
                  }
                  className="bg-white dark:bg-gray-800 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 w-full"
                />
              </div>
              <button
                type="submit"
                className="flex justify-center items-center gap-2 bg-primary-600 hover:bg-primary-700 px-4 py-2 rounded-md w-full text-white transition-colors"
              >
                <FaKey /> Submit
              </button>
            </form>
          )}
        </>
      )}

      {/* Credentials list */}
      <div className="space-y-3">
        {creds.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">
            No credentials found.
          </p>
        ) : (
          creds.map((c) => (
            <div
              key={c.id}
              className="flex justify-between items-center bg-gray-50 hover:bg-primary-50 dark:bg-gray-700 dark:hover:bg-gray-600 p-3 border border-gray-200 dark:border-gray-600 rounded-md text-gray-600 dark:text-gray-300 transition-colors"
            >
              <div>
                <p className="flex items-center gap-2 text-sm">
                  <FiGlobe /> {c.website || "N/A"}
                </p>
                <p className="flex items-center gap-2 font-medium">
                  <FiMail /> {c.email}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => handleFill(c)}
                  className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded-md text-white text-sm transition-colors"
                >
                  <FaKey /> Apply
                </button>
                {(user.role === "super_admin" || user.role === "admin") && (
                  <button
                    onClick={() => handleOpenDetails(c.id)}
                    className="flex items-center gap-1 bg-green-500 hover:bg-green-600 px-3 py-1 rounded-md text-white text-sm transition-colors"
                  >
                    <IoOpenOutline /> Open
                  </button>
                )}
                {user.role === "super_admin" && (
                  <button
                    onClick={async () => {
                      if (
                        window.confirm(
                          "Are you sure you want to delete this credential?"
                        )
                      ) {
                        await deleteCredential(c.id);
                        const newCreds = await fetchCredentials();
                        setCreds(newCreds);
                        if (selectedCredential === c.id) {
                          setShowDetails(false);
                          setSelectedCredential(null);
                        }
                      }
                    }}
                    className="flex items-center gap-1 bg-red-600 hover:bg-red-700 px-3 py-1 rounded-md text-white text-sm transition-colors"
                  >
                    <FiTrash /> Delete
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Credential details */}
      {showDetails && selectedCredential && (
        <div className="bg-gray-100 dark:bg-gray-700 shadow mt-6 p-4 rounded-md text-gray-600 dark:text-gray-300">
          <div className="flex justify-between items-center mb-3">
            <h3 className="flex items-center gap-2 font-semibold text-lg">
              <FaKey /> {isEditing ? "Edit Credential" : "Credential Details"}
            </h3>
            {user.role === "super_admin" && !isEditing && (
              <button
                onClick={handleEdit}
                className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded-md text-white text-sm transition-colors"
              >
                <FiEdit /> Edit
              </button>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block flex items-center gap-1 mb-1 font-medium text-sm">
                  <FiMail /> Email:
                </label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, email: e.target.value })
                  }
                  required
                  className="bg-white dark:bg-gray-800 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 w-full"
                />
              </div>
              <div>
                <label className="block flex items-center gap-1 mb-1 font-medium text-sm">
                  <FiLock /> Password:
                </label>
                <input
                  type="password"
                  value={editFormData.password}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, password: e.target.value })
                  }
                  required
                  className="bg-white dark:bg-gray-800 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 w-full"
                />
              </div>
              <div>
                <label className="block flex items-center gap-1 mb-1 font-medium text-sm">
                  <FiGlobe /> Website:
                </label>
                <input
                  type="url"
                  value={editFormData.website}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, website: e.target.value })
                  }
                  className="bg-white dark:bg-gray-800 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 w-full"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex items-center gap-1 bg-green-500 hover:bg-green-600 px-4 py-2 rounded-md text-white transition-colors"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={handleEditCancel}
                  className="flex items-center gap-1 bg-gray-500 hover:bg-gray-600 px-4 py-2 rounded-md text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Assigned Users */}
              <div className="mb-4">
                <h4 className="flex items-center gap-2 mb-2 font-medium">
                  <FiUserX /> Assigned Users:
                </h4>
                {assignedUsers.length === 0 ? (
                  <p className="text-gray-500">No users assigned.</p>
                ) : (
                  <ul className="space-y-2">
                    {assignedUsers.map((u: any) => (
                      <li
                        key={u.id}
                        className="flex justify-between items-center bg-white dark:bg-gray-800 p-2 rounded"
                      >
                        <span>
                          {u.email} ({u.role})
                        </span>
                        <button
                          onClick={() => handleRemoveUserAccess(u.id)}
                          className="flex items-center gap-1 bg-red-500 hover:bg-red-600 px-2 py-1 rounded text-white text-sm"
                        >
                          <FiUserX /> Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Add User */}
              <div>
                <h4 className="flex items-center gap-2 mb-2 font-medium">
                  <FiUserPlus /> Add User Access:
                </h4>
                <select
                  onChange={(e) => {
                    const userId = parseInt(e.target.value);
                    if (userId) handleAddUserAccess(userId);
                    e.target.value = "";
                  }}
                  className="bg-white dark:bg-gray-800 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md w-full"
                >
                  <option value="">Select a user</option>
                  {allUsers
                    .filter(
                      (u: any) => !assignedUsers.some((au: any) => au.id === u.id)
                    )
                    .map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.email} ({u.role})
                      </option>
                    ))}
                </select>
              </div>

              <button
                onClick={() => setShowDetails(false)}
                className="flex items-center gap-1 bg-gray-500 hover:bg-gray-600 mt-4 px-4 py-2 rounded-md text-white transition-colors"
              >
                <FiX /> Close
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
