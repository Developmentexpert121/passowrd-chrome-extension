import { useState } from "react";
import Login from "./pages/Login.js";
import Dashboard from "./pages/Dashboard.js";

function App() {
  const [user, setUser] = useState<any>(null);

  return (
    <div>{!user ? <Login onLogin={setUser} /> : <Dashboard user={user} />}</div>
  );
}

export default App;
