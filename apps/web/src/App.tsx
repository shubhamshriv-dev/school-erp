import { createContext, useContext, useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { api, SessionUser } from "./api";
import { Shell } from "./Shell";
import { AdmissionsPage } from "./pages/AdmissionsPage";
import { AttendancePage } from "./pages/AttendancePage";
import { DashboardPage } from "./pages/DashboardPage";
import { FeesPage } from "./pages/FeesPage";
import { LoginPage } from "./pages/LoginPage";
import { SetupPage } from "./pages/SetupPage";
import { StudentPage } from "./pages/StudentPage";
import { StudentsPage } from "./pages/StudentsPage";

type AuthState = {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("Auth is missing");
  }
  return value;
}

export function App() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  async function refresh() {
    try {
      const me = await api<SessionUser>("/v1/auth/me");
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function logout() {
    await api("/v1/auth/logout", { method: "POST" });
    setUser(null);
    navigate("/login");
  }

  if (loading) {
    return <div className="grid min-h-screen place-items-center text-stone-500">Opening the school…</div>;
  }

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout }}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage onSuccess={refresh} />} />
        <Route element={user ? <Shell /> : <Navigate to="/login" replace />}>
          <Route index element={<DashboardPage />} />
          <Route path="setup" element={<SetupPage />} />
          <Route path="admissions" element={<AdmissionsPage />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="students/:id" element={<StudentPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="fees" element={<FeesPage />} />
        </Route>
      </Routes>
    </AuthContext.Provider>
  );
}
