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

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFill = async (c: {
    email: string;
    password: string;
    website?: string;
  }) => {
    setErrorMessage(null);
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab && tab.id && tab.url) {
      const currentHostname = new URL(tab.url).hostname;
      let storedHostname = null;
      if (c.website) {
        try {
          storedHostname = new URL(c.website).hostname;
        } catch (e) {
          storedHostname = c.website; // If not a URL, use as is
        }
      }
      // Normalize by removing www
      const normalize = (host: string) => host.replace(/^www\./, "");
      if (
        storedHostname &&
        normalize(currentHostname) !== normalize(storedHostname)
      ) {
        setErrorMessage("Credential website does not match current site.");
        return;
      }
      chrome.tabs.sendMessage(tab.id, {
        action: "fillCredentials",
        email: c.email,
        password: c.password,
        website: storedHostname,
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
    const currentCred = creds.find((c) => c.id === selectedCredential);
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
      {errorMessage && (
        <div className="px-4 py-3 text-red-700 bg-red-100 border border-red-400 rounded dark:bg-red-900 dark:text-red-300">
          {errorMessage}
        </div>
      )}
      {user.role === "super_admin" && (
        <>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 text-white transition-colors rounded-md cursor-pointer bg-primary-600 hover:bg-primary-700"
          >
            {showForm ? <FiX /> : <FiPlus />}
            {showForm ? "Cancel" : "Add New Credential"}
          </button>

          {showForm && (
            <form
              onSubmit={handleSubmit}
              className="p-4 space-y-4 bg-gray-100 rounded-md dark:bg-gray-700"
            >
              <div>
                <label className="flex items-center block gap-1 mb-1 text-sm font-medium">
                  <FiMail /> Email:
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="flex items-center block gap-1 mb-1 text-sm font-medium">
                  <FiLock /> Password:
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="flex items-center block gap-1 mb-1 text-sm font-medium">
                  <FiGlobe /> Website:
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) =>
                    setFormData({ ...formData, website: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <button
                type="submit"
                className="flex items-center justify-center w-full gap-2 px-4 py-2 text-white transition-colors rounded-md cursor-pointer bg-primary-600 hover:bg-primary-700"
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
            <div key={c.id}>
              <div className="flex items-center justify-between p-3 text-gray-600 transition-colors border border-gray-200 rounded-md bg-gray-50 hover:bg-primary-50 dark:bg-gray-700 dark:hover:bg-gray-600 dark:border-gray-600 dark:text-gray-300">
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
                    className="flex items-center gap-1 px-3 py-1 text-sm text-white transition-colors bg-blue-500 rounded-md cursor-pointer hover:bg-blue-600"
                  >
                    <FaKey /> Apply
                  </button>
                  {(user.role === "super_admin" || user.role === "admin") && (
                    <button
                      onClick={() => handleOpenDetails(c.id)}
                      className="flex items-center gap-1 px-3 py-1 text-sm text-white transition-colors bg-green-500 rounded-md cursor-pointer hover:bg-green-600"
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
                      className="flex items-center gap-1 px-3 py-1 text-sm text-white transition-colors bg-red-600 rounded-md cursor-pointer hover:bg-red-700"
                    >
                      <FiTrash /> Delete
                    </button>
                  )}
                </div>
              </div>
              {showDetails && selectedCredential === c.id && (
                <div className="p-4 mt-3 text-gray-600 bg-gray-100 rounded-md shadow dark:bg-gray-700 dark:text-gray-300">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="flex items-center gap-2 text-lg font-semibold">
                      <FaKey />{" "}
                      {isEditing ? "Edit Credential" : "Credential Details"}
                    </h3>
                    {user.role === "super_admin" && !isEditing && (
                      <button
                        onClick={handleEdit}
                        className="items-center gap-1 p-2 text-sm text-white transition-colors bg-blue-500 rounded-md cursor-pointerflex hover:bg-blue-600"
                      >
                        <FiEdit />
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <form onSubmit={handleEditSubmit} className="space-y-4">
                      <div>
                        <label className="flex items-center block gap-1 mb-1 text-sm font-medium">
                          <FiMail /> Email:
                        </label>
                        <input
                          type="email"
                          value={editFormData.email}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              email: e.target.value,
                            })
                          }
                          required
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="flex items-center block gap-1 mb-1 text-sm font-medium">
                          <FiLock /> Password:
                        </label>
                        <input
                          type="password"
                          value={editFormData.password}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              password: e.target.value,
                            })
                          }
                          required
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="flex items-center block gap-1 mb-1 text-sm font-medium">
                          <FiGlobe /> Website:
                        </label>
                        <input
                          type="url"
                          value={editFormData.website}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              website: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="flex items-center gap-1 px-4 py-2 text-white transition-colors bg-green-500 rounded-md cursor-pointer hover:bg-green-600"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={handleEditCancel}
                          className="flex items-center gap-1 px-4 py-2 text-white transition-colors bg-gray-500 rounded-md cursor-pointer hover:bg-gray-600"
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
                                className="flex items-center justify-between p-2 bg-white rounded dark:bg-gray-800"
                              >
                                <span>
                                  {u.email} ({u.role})
                                </span>
                                <button
                                  onClick={() => handleRemoveUserAccess(u.id)}
                                  className="flex items-center gap-1 px-2 py-1 text-sm text-white bg-red-500 rounded cursor-pointer hover:bg-red-600"
                                >
                                  <FiUserX />
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
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600"
                        >
                          <option value="">Select a user</option>
                          {allUsers
                            .filter(
                              (u: any) =>
                                !assignedUsers.some(
                                  (au: any) => au.id === u.id
                                ) && u.role !== "super_admin"
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
                        className="flex items-center gap-1 px-4 py-2 mt-4 text-white transition-colors bg-gray-500 rounded-md cursor-pointer hover:bg-gray-600"
                      >
                        <FiX /> Close
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
