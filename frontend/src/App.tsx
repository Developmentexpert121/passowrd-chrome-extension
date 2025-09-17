import { useState, useEffect } from "react";
import Login from "./pages/Login.js";
import Dashboard from "./pages/Dashboard.js";
import { verifyUser, clearStorage } from "./utils/api.js";

function App() {
  const [user, setUser] = useState<{
    id: number;
    role: "user" | "super_admin" | "admin";
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const verifiedUser = await verifyUser();
      setUser(verifiedUser);
      setLoading(false);
    };
    checkAuth();
  }, []);

  const handleLogout = async () => {
    await clearStorage();
    setUser(null);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {!user ? (
        <Login onLogin={setUser} />
      ) : (
        <Dashboard user={user} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;
