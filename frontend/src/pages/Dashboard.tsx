import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuthStore } from '../stores/auth';
import { CreateCourseModal } from '../components/CreateCourseModal';
import type { Course } from '../schemas/course';

export function Dashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const fetchCourses = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/courses/');
      setCourses(response.data);
    } catch {
      toast.error('Erro ao carregar cursos.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', textAlign: 'left', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <h1 style={{ margin: 0 }}>Meus Cursos</h1>
        <div>
          <button onClick={() => setIsModalOpen(true)} className="counter" style={{ background: 'var(--accent)', color: 'white', marginRight: '1rem' }}>
            + Novo Curso
          </button>
          <button onClick={handleLogout} className="counter">Sair</button>
        </div>
      </div>

      {isLoading ? (
        <p>Carregando cursos...</p>
      ) : courses.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--social-bg)', borderRadius: '8px', border: '1px dashed var(--border)' }}>
          <p style={{ color: 'var(--text)' }}>Você ainda não possui cursos. Clique em "Novo Curso" para começar.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {courses.map((course) => (
            <div key={course.id} style={{ border: '1px solid var(--border)', padding: '1.5rem', borderRadius: '8px', background: 'var(--code-bg)' }}>
              <h2 style={{ fontSize: '20px', marginTop: 0 }}>{course.name}</h2>
              <p style={{ fontSize: '14px', color: 'var(--text)', marginBottom: '1rem' }}>
                {course.description || 'Sem descrição'}
              </p>
              <div style={{ fontSize: '13px', color: 'var(--text)', marginBottom: '1rem' }}>
                <div><strong>Início:</strong> {new Date(course.start_date).toLocaleDateString('pt-BR')}</div>
                <div><strong>Fim:</strong> {new Date(course.end_date).toLocaleDateString('pt-BR')}</div>
              </div>
              <button 
                onClick={() => navigate(`/courses/${course.id}`)} 
                className="counter" 
                style={{ width: '100%', margin: 0 }}
              >
                Gerenciar Aulas
              </button>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <CreateCourseModal 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={fetchCourses} 
        />
      )}
    </div>
  );
}