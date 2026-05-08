import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore, type Role } from './stores/auth';
import './App.css';

import viteLogo from './assets/vite.svg';

// Lazy loading das páginas (Otimização de Performance)
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Register').then((m) => ({ default: m.Register })));
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const AdminPanel = lazy(() => import('./pages/AdminPanel').then((m) => ({ default: m.AdminPanel })));
const CourseDetails = lazy(() => import('./pages/CourseDetails').then((m) => ({ default: m.CourseDetails })));

const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '1rem' }}>
    <img src={viteLogo} alt="Carregando" width="50" style={{ animation: 'pulse 1.5s infinite' }} />
    <p style={{ color: 'var(--text)', fontWeight: 500 }}>Carregando módulo...</p>
  </div>
);

// Route Guard Granular (RBAC)
// Agora aceita um array opcional de papéis (roles) autorizados
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: Role[] }) => {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  // 1. Verificação de Autenticação Base
  if (!token) return <Navigate to="/login" replace />;

  // 2. Verificação de Autorização (RBAC)
  // Se a rota exige papéis específicos e o utilizador não os tem, é redirecionado silenciosamente
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function App() {
  const token = useAuthStore((state) => state.token);

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={token ? <Navigate to="/dashboard" replace /> : <Login />} />
          <Route path="/register" element={token ? <Navigate to="/dashboard" replace /> : <Register />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Rota estritamente blindada: Componente protegido antes da montagem */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminPanel />
              </ProtectedRoute>
            }
          />

          <Route
            path="/courses/:id"
            element={
              <ProtectedRoute>
                <CourseDetails />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to={token ? "/dashboard" : "/login"} replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;