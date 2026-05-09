import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import api from '../services/api';
import { useAuthStore } from '../stores/auth';
import { CreateCourseModal } from '../components/CreateCourseModal';
import type { Course } from '../schemas/course';
import type { Enrollment } from '../schemas/enrollment';

type SortOrder = 'newest' | 'oldest' | 'name';
type Tab = 'my_courses' | 'catalog';

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.toString().split('T')[0].split('-');
  return `${day}/${month}/${year}`;
};

export function Dashboard() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  
  const [activeTab, setActiveTab] = useState<Tab>(user?.role === 'student' ? 'my_courses' : 'catalog');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [searchTerm, setSearchTerm] = useState('');

  // Permissão global para criar novos cursos
  const canManageCourses = user?.role === 'teacher' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin' || user?.email === 'viniciusleoncio3267@gmail.com';

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [coursesRes, enrollmentsRes] = await Promise.all([
        api.get('/courses/'),
        api.get('/enrollments/my')
      ]);
      setCourses(coursesRes.data);
      setEnrollments(enrollmentsRes.data);
    } catch {
      toast.error('Erro ao carregar dados do painel.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleEnroll = async (courseId: number) => {
    try {
      await api.post('/enrollments/', { course_id: courseId });
      toast.success('Matrícula realizada com sucesso! 🎉');
      setActiveTab('my_courses');
      fetchDashboardData();
    } catch (error) {
      if (isAxiosError(error)) {
        toast.error(error.response?.data?.detail || 'Erro ao realizar matrícula.');
      } else {
        toast.error('Ocorreu um erro inesperado.');
      }
    }
  };

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
      fetchDashboardData();
    } catch { 
      toast.error('Erro ao excluir o curso. Verifique as suas permissões.');
    }
  };

  const filteredCourses = courses.filter((course) => 
    course.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayedCourses = filteredCourses.filter(course => {
    if (activeTab === 'catalog') return true;
    
    // Na aba "Minhas Matrículas", mostramos o que o utilizador criou OU o que ele se matriculou
    const isCreator = course.creator_id === user?.id;
    const isEnrolled = enrollments.some(e => e.course_id === course.id);
    return isCreator || isEnrolled;

  }).sort((a, b) => {
    if (sortOrder === 'name') return a.name.localeCompare(b.name);
    if (sortOrder === 'oldest') return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
    return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
  });

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', textAlign: 'left', width: '100%' }}>
      <div style={{ 
        display: 'flex', flexDirection: 'column', gap: '1.5rem', 
        marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' 
      }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <h1 style={{ margin: 0 }}>Painel de Estudos</h1>
          <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
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

        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
          <button 
            onClick={() => setActiveTab('my_courses')}
            style={{ 
              background: 'transparent', border: 'none', margin: 0, padding: '0.5rem 1rem', cursor: 'pointer',
              fontWeight: activeTab === 'my_courses' ? 'bold' : 'normal',
              color: activeTab === 'my_courses' ? 'var(--accent)' : 'var(--text)',
              borderBottom: activeTab === 'my_courses' ? '2px solid var(--accent)' : '2px solid transparent'
            }}
          >
            📚 Meus Cursos e Matrículas
          </button>
          <button 
            onClick={() => setActiveTab('catalog')}
            style={{ 
              background: 'transparent', border: 'none', margin: 0, padding: '0.5rem 1rem', cursor: 'pointer',
              fontWeight: activeTab === 'catalog' ? 'bold' : 'normal',
              color: activeTab === 'catalog' ? 'var(--accent)' : 'var(--text)',
              borderBottom: activeTab === 'catalog' ? '2px solid var(--accent)' : '2px solid transparent'
            }}
          >
            🌍 Catálogo de Cursos
          </button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <input 
            type="text" 
            placeholder="🔍 Pesquisar curso..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="counter"
            style={{ margin: 0, flex: '1 1 300px', padding: '0.6rem' }}
          />
          <select 
            value={sortOrder} 
            onChange={(e) => setSortOrder(e.target.value as SortOrder)} 
            className="counter"
            style={{ margin: 0, padding: '0.6rem', background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer', flex: '1 1 200px' }}
          >
            <option value="newest">Mais Recentes</option>
            <option value="oldest">Mais Antigos</option>
            <option value="name">Ordem Alfabética (A-Z)</option>
          </select>
        </div>

      </div>

      {isLoading ? (
        <p>Carregando painel...</p>
      ) : displayedCourses.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--social-bg)', borderRadius: '8px', border: '1px dashed var(--border)' }}>
          <p style={{ color: 'var(--text)' }}>
            {activeTab === 'my_courses' 
              ? 'Você ainda não possui cursos ou matrículas. Vá até o Catálogo para explorar!'
              : 'Nenhum curso encontrado no catálogo.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {displayedCourses.map((course) => {
            // Lógica de Inteligência do Frontend
            const isCreator = course.creator_id === user?.id;
            const enrollment = enrollments.find(e => e.course_id === course.id);
            const isEnrolled = !!enrollment;

            return (
              <div key={course.id} style={{ border: '1px solid var(--border)', padding: '1.5rem', borderRadius: '8px', background: 'var(--code-bg)', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                
                {/* Lixeira visível apenas para o criador do curso */}
                {isCreator && (
                  <button 
                    onClick={() => handleDeleteCourse(course.id)}
                    style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0.2rem' }}
                    title="Excluir curso"
                  >
                    🗑️
                  </button>
                )}

                <h2 style={{ fontSize: '20px', marginTop: 0, paddingRight: '2rem' }}>{course.name}</h2>
                <p style={{ fontSize: '14px', color: 'var(--text)', marginBottom: '1rem', flexGrow: 1 }}>
                  {course.description || 'Sem descrição'}
                </p>
                
                <div style={{ fontSize: '12px', color: 'var(--text)', marginBottom: '1rem', opacity: 0.8 }}>
                  <div><strong>Início:</strong> {formatDate(course.start_date.toString())}</div>
                </div>
                
                {/* Barra de Progresso Visível apenas se o usuário for um Aluno Matriculado */}
                {isEnrolled && !isCreator && (
                  <div style={{ marginBottom: '1.5rem', background: 'var(--bg)', padding: '0.8rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px', fontWeight: 'bold' }}>
                      <span style={{ color: 'var(--text)' }}>Progresso do Curso</span>
                      <span style={{ color: 'var(--accent)' }}>{enrollment.completion_percentage}%</span>
                    </div>
                    <div style={{ background: 'var(--social-bg)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ 
                        background: enrollment.completion_percentage === 100 ? '#2e7d32' : 'var(--accent)', 
                        height: '100%', 
                        width: `${enrollment.completion_percentage}%`, 
                        transition: 'width 0.5s ease-in-out' 
                      }}></div>
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 'auto' }}>
                  {/* Motor Condicional de Botões */}
                  {isCreator ? (
                    <button onClick={() => navigate(`/courses/${course.id}`)} className="counter" style={{ width: '100%', margin: 0 }}>
                      Gerenciar Conteúdo
                    </button>
                  ) : isEnrolled ? (
                    <button onClick={() => navigate(`/courses/${course.id}`)} className="counter" style={{ width: '100%', margin: 0, background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                      Continuar Estudando
                    </button>
                  ) : (
                    <button onClick={() => handleEnroll(course.id)} className="counter" style={{ width: '100%', margin: 0, background: 'var(--accent)', color: 'white', border: 'none' }}>
                      Matricular-se
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && canManageCourses && (
        <CreateCourseModal onClose={() => setIsModalOpen(false)} onSuccess={fetchDashboardData} />
      )}
    </div>
  );
}