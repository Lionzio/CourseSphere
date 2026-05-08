import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth';
import './App.css';

// Importação dos assets mantendo a identidade visual
import reactLogo from './assets/react.svg';
import viteLogo from './assets/vite.svg';
import heroImg from './assets/hero.png';

// Lazy loading das páginas (Otimização de Performance / Code Splitting)
// Como utilizamos named exports nas páginas, mapeamos para 'default'
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Register').then((m) => ({ default: m.Register })));
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));

// Fallback de carregamento elegante enquanto o chunk da página é baixado
const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '1rem' }}>
    <img src={viteLogo} alt="Carregando" width="50" style={{ animation: 'pulse 1.5s infinite' }} />
    <p style={{ color: 'var(--text)', fontWeight: 500 }}>Carregando módulo...</p>
  </div>
);

/**
 * Componente HOC (Higher-Order Component) para blindagem de rotas.
 * Centraliza a regra de negócio de autorização da interface.
 */
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = useAuthStore((state) => state.token);
  
  if (!token) {
    // O 'replace' substitui o histórico, impedindo que o usuário volte com o botão "Back" do navegador
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

/**
 * Layout Base para as páginas que ainda estão em desenvolvimento
 */
const PageLayout = ({ title }: { title: string }) => (
  <>
    <section id="center">
      <div className="hero">
        <img src={heroImg} className="base" width="170" height="179" alt="CourseSphere Hero" />
        <img src={reactLogo} className="framework" alt="React logo" />
        <img src={viteLogo} className="vite" alt="Vite logo" />
      </div>
      <div>
        <h1>{title}</h1>
        <p>Módulo em desenvolvimento para a próxima Sprint...</p>
      </div>
    </section>
    <div className="ticks"></div>
    <section id="spacer"></section>
  </>
);

function App() {
  const token = useAuthStore((state) => state.token);

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Rotas Públicas - Redirecionam para o Dashboard se o usuário já estiver logado */}
          <Route path="/login" element={token ? <Navigate to="/dashboard" replace /> : <Login />} />
          <Route path="/register" element={token ? <Navigate to="/dashboard" replace /> : <Register />} />

          {/* Rotas Protegidas - O uso do ProtectedRoute limpa a leitura do código */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses/:id"
            element={
              <ProtectedRoute>
                <PageLayout title="Gestão de Aulas do Curso" />
              </ProtectedRoute>
            }
          />

          {/* Redirecionamento Inteligente na Raiz */}
          <Route path="/" element={<Navigate to={token ? "/dashboard" : "/login"} replace />} />

          {/* Fallback Catch-All (Página 404 invisível) */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;