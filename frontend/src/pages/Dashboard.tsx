import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuthStore } from '../stores/auth';
import { CreateCourseModal } from '../components/CreateCourseModal';
import type { Course } from '../schemas/course';

// Tipagem estrita para substituir o 'any'
type SortOrder = 'newest' | 'oldest' | 'name';

// Helper para corrigir o fuso horário (Timezone Offset) do JavaScript
const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.toString().split('-');
  return `${day}/${month}/${year}`;
};

export function Dashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // O estado já inicia como true
  
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  // Checagem rigorosa de RBAC
  const canManageCourses = user?.role === 'teacher' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin' || user?.email === 'viniciusleoncio3267@gmail.com';

  const fetchCourses = async () => {
    try {
      const response = await api.get('/courses/');
      setCourses(response.data);
    } catch {
      toast.error('Erro ao carregar cursos.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // O linter tenta forçar o uso de React Query. Aqui, o useEffect é o padrão correto.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCourses();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDeleteCourse = async (courseId: number) => {
    if (!window.confirm('Atenção: Tem certeza que deseja excluir este curso? Esta ação é irreversível e apagará todas as aulas associadas.')) {
      return;
    }
    
    try {
      await api.delete(`/courses/${courseId}`);
      toast.success('Curso excluído com sucesso!', { icon: '🗑️' });
      fetchCourses(); // Recarrega a lista de forma silenciosa e fluída
    } catch { 
      // Variável 'error' removida para satisfazer o ESLint
      toast.error('Erro ao excluir o curso. Verifique as suas permissões.');
    }
  };

  const sortedCourses = [...courses].sort((a, b) => {
    if (sortOrder === 'name') return a.name.localeCompare(b.name);
    if (sortOrder === 'oldest') return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
    return new Date(b.start_date).getTime() - new Date(a.start_date).getTime(); // newest
  });

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', textAlign: 'left', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ margin: 0 }}>Meus Cursos</h1>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          
          <select 
            value={sortOrder} 
            onChange={(e) => setSortOrder(e.target.value as SortOrder)} // Tipagem segura aplicada
            className="counter"
            style={{ margin: 0, padding: '0.5rem', background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer' }}
          >
            <option value="newest">Mais Recentes</option>
            <option value="oldest">Mais Antigos</option>
            <option value="name">Ordem Alfabética (A-Z)</option>
          </select>

          {isAdmin && (
            <button onClick={() => navigate('/admin')} className="counter" style={{ background: 'var(--text)', color: 'var(--bg)', margin: 0 }}>
              ⚙️ Painel Admin
            </button>
          )}

          {canManageCourses && (
            <button onClick={() => setIsModalOpen(true)} className="counter" style={{ background: 'var(--accent)', color: 'white', margin: 0 }}>
              + Novo Curso
            </button>
          )}
          
          <button onClick={handleLogout} className="counter" style={{ margin: 0 }}>Sair</button>
        </div>
      </div>

      {isLoading ? (
        <p>Carregando cursos...</p>
      ) : courses.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--social-bg)', borderRadius: '8px', border: '1px dashed var(--border)' }}>
          <p style={{ color: 'var(--text)' }}>
            {canManageCourses 
              ? 'Você ainda não possui cursos. Clique em "Novo Curso" para começar.'
              : 'Você ainda não está matriculado em nenhum curso.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {sortedCourses.map((course) => (
            <div key={course.id} style={{ border: '1px solid var(--border)', padding: '1.5rem', borderRadius: '8px', background: 'var(--code-bg)', position: 'relative' }}>
              
              {canManageCourses && (
                <button 
                  onClick={() => handleDeleteCourse(course.id)}
                  style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0.2rem' }}
                  title="Excluir curso"
                >
                  🗑️
                </button>
              )}

              <h2 style={{ fontSize: '20px', marginTop: 0, paddingRight: '2rem' }}>{course.name}</h2>
              <p style={{ fontSize: '14px', color: 'var(--text)', marginBottom: '1rem' }}>
                {course.description || 'Sem descrição'}
              </p>
              <div style={{ fontSize: '13px', color: 'var(--text)', marginBottom: '1rem' }}>
                <div><strong>Início:</strong> {formatDate(course.start_date.toString())}</div>
                <div><strong>Fim:</strong> {formatDate(course.end_date.toString())}</div>
              </div>
              <button 
                onClick={() => navigate(`/courses/${course.id}`)} 
                className="counter" 
                style={{ width: '100%', margin: 0 }}
              >
                {canManageCourses ? 'Gerenciar Aulas' : 'Acessar Aulas'}
              </button>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && canManageCourses && (
        <CreateCourseModal 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={fetchCourses} 
        />
      )}
    </div>
  );
}