import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuthStore } from '../stores/auth';
import { CreateLessonModal } from '../components/CreateLessonModal';
import type { Course } from '../schemas/course';
import type { Lesson } from '../schemas/lesson';

export function CourseDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Verificação de permissões para gestão (Professores e Admins)
  const canManage = user?.role === 'teacher' || user?.role === 'admin';

  const fetchData = async () => {
    try {
      // Procuramos o curso e as suas aulas em paralelo para maior performance
      const [courseRes, lessonsRes] = await Promise.all([
        api.get(`/courses/${id}`),
        api.get(`/courses/${id}/lessons`)
      ]);
      setCourse(courseRes.data);
      setLessons(lessonsRes.data);
    } catch {
      toast.error('Erro ao carregar detalhes do curso.');
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleDeleteLesson = async (lessonId: number) => {
    if (!window.confirm('Deseja realmente excluir esta aula?')) return;
    
    try {
      await api.delete(`/lessons/${lessonId}`);
      toast.success('Aula removida com sucesso.');
      fetchData(); // Recarrega a lista
    } catch {
      toast.error('Erro ao remover a aula.');
    }
  };

  if (isLoading) return <div style={{ padding: '2rem' }}>Carregando conteúdo...</div>;
  if (!course) return null;

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto', textAlign: 'left', width: '100%' }}>
      {/* Cabeçalho do Curso */}
      <div style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <button onClick={() => navigate('/dashboard')} style={{ marginBottom: '1rem', background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0 }}>
          ← Voltar aos Cursos
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ margin: 0 }}>{course.name}</h1>
            <p style={{ color: 'var(--text)', marginTop: '0.5rem' }}>{course.description}</p>
          </div>
          {canManage && (
            <button onClick={() => setIsModalOpen(true)} className="counter" style={{ background: 'var(--accent)', color: 'white', margin: 0 }}>
              + Adicionar Aula
            </button>
          )}
        </div>
      </div>

      {/* Lista de Aulas */}
      <h3 style={{ marginBottom: '1.5rem' }}>Conteúdo Programático ({lessons.length} aulas)</h3>
      
      {lessons.length === 0 ? (
        <p style={{ color: 'var(--text)', fontStyle: 'italic' }}>Nenhuma aula cadastrada neste curso.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {lessons.map((lesson, index) => (
            <div 
              key={lesson.id} 
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '1rem', 
                background: 'var(--code-bg)', 
                borderRadius: '8px', 
                border: '1px solid var(--border)',
                opacity: lesson.status === 'draft' ? 0.7 : 1
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--accent)', minWidth: '25px' }}>{index + 1}.</span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 500 }}>{lesson.title}</span>
                    {/* Badge de Status */}
                    <span style={{ 
                      fontSize: '10px', 
                      padding: '2px 6px', 
                      borderRadius: '4px', 
                      textTransform: 'uppercase',
                      background: lesson.status === 'published' ? '#2e7d32' : '#757575',
                      color: 'white'
                    }}>
                      {lesson.status === 'published' ? 'Publicada' : 'Rascunho'}
                    </span>
                  </div>
                  {lesson.video_url && (
                    <a href={lesson.video_url} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'none' }}>
                      📺 Ver vídeo da aula
                    </a>
                  )}
                </div>
              </div>

              {canManage && (
                <button 
                  onClick={() => handleDeleteLesson(lesson.id)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}
                  title="Excluir aula"
                >
                  🗑️
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de Criação (Só renderiza se for gestor) */}
      {isModalOpen && canManage && (
        <CreateLessonModal 
          courseId={Number(id)} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={fetchData} 
        />
      )}
    </div>
  );
}