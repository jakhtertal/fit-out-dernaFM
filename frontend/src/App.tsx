import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout       from './components/Layout';
import LoginPage    from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ShopsPage    from './pages/ShopsPage';
import InspectionsPage from './pages/InspectionsPage';
import InspectionFormPage from './pages/InspectionFormPage';
import IssuesPage   from './pages/IssuesPage';
import ChecklistsPage from './pages/ChecklistsPage';
import UsersPage    from './pages/UsersPage';
import ReportsPage   from './pages/ReportsPage';
import SettingsPage  from './pages/SettingsPage';

function Guard({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-brand-600">
      <div className="text-white text-xl animate-pulse">Loading DERNA FM…</div>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route element={<Guard><Layout /></Guard>}>
        <Route index element={<DashboardPage />} />
        <Route path="shops"         element={<ShopsPage />} />
        <Route path="inspections"   element={<InspectionsPage />} />
        <Route path="inspections/new" element={<InspectionFormPage />} />
        <Route path="issues"        element={<IssuesPage />} />
        <Route path="checklists"    element={<ChecklistsPage />} />
        <Route path="users"         element={<UsersPage />} />
        <Route path="reports"       element={<ReportsPage />} />
        <Route path="settings"      element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
