import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth';

// Importação dos assets mantendo a identidade visual
import reactLogo from './assets/react.svg';
import viteLogo from './assets/vite.svg';
import heroImg from './assets/hero.png';
import './App.css';

/**
 * Layout Base para as páginas Placeholder
 * Une a estética do CourseSphere com a lógica de roteamento.
 */
const PageLayout = ({ title, showHero = false }: { title: string; showHero?: boolean }) => (
  <>
    <section id="center">
      <div className="hero">
        <img src={heroImg} className="base" width="170" height="179" alt="CourseSphere Hero" />
        <img src={reactLogo} className="framework" alt="React logo" />
        <img src={viteLogo} className="vite" alt="Vite logo" />
      </div>
      <div>
        <h1>{title}</h1>
        <p>
          Sprint 6: Fundação e Roteamento operando.
          <br />
          <code>src/pages</code> em desenvolvimento...
        </p>
      </div>
    </section>

    <div className="ticks"></div>

    <section id="next-steps">
      <div id="docs">
        <h2>Próximos Passos</h2>
        <p>O roteamento está configurado com <strong>Zustand</strong> e <strong>Axios</strong>.</p>
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
      <Routes>
        {/* Rotas Públicas */}
        <Route path="/login" element={<PageLayout title="Login" />} />
        <Route path="/register" element={<PageLayout title="Registro" />} />

        {/* Rotas Protegidas - Redirecionam para /login se não houver token */}
        <Route
          path="/dashboard"
          element={token ? <PageLayout title="Dashboard" /> : <Navigate to="/login" />}
        />
        <Route
          path="/courses/:id"
          element={token ? <PageLayout title="Detalhes do Curso" /> : <Navigate to="/login" />}
        />

        {/* Redirecionamento Inteligente na Raiz */}
        <Route path="/" element={<Navigate to={token ? "/dashboard" : "/login"} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;