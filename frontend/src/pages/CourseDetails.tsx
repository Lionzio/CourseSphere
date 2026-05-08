import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from 'axios'; // Importação do Axios puro para a API Externa
import api from '../services/api';
import { useAuthStore } from '../stores/auth';
import { CreateLessonModal } from '../components/CreateLessonModal';
import type { Course } from '../schemas/course';
import type { Lesson } from '../schemas/lesson';

// Tipagem estrita para o Instrutor Convidado (RandomUser API)
interface GuestInstructor {
  name: string;
  picture: string;
}

type StatusFilter = 'all' | 'published' | 'draft';

export function CourseDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Novos Estados (Sprint 12)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [instructor, setInstructor] = useState<GuestInstructor | null>(null);

  const canManage = user?.role === 'teacher' || user?.role === 'admin';

  const fetchData = async () => {
    try {
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

  // Função assíncrona isolada para não bloquear o carregamento principal da página
  const fetchGuestInstructor = async () => {
    try {
      // Usamos nat=br para trazer nomes formatados no padrão brasileiro (Overdelivering)
      const res = await axios.get('https://randomuser.me/api/?inc=name,picture&nat=br');
      const data = res.data.results[0];
      setInstructor({
        name: `${data.name.first} ${data.name.last}`,
        picture: data.picture.medium
      });
    } catch (error) {
      console.warn('A API externa do RandomUser falhou, ignorando o Instrutor Convidado.', error);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
    fetchGuestInstructor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleDeleteLesson = async (lessonId: number) => {
    if (!window.confirm('Deseja realmente excluir esta aula?')) return;
    
    try {
      await api.delete(`/lessons/${lessonId}`);
      toast.success('Aula removida com sucesso.');
      fetchData(); // Recarrega a lista nativamente
    } catch {
      toast.error('Erro ao remover a aula.');
    }
  };

  // Lógica de Filtragem de Status no Frontend
  const filteredLessons = lessons.filter((lesson) => {
    if (statusFilter === 'all') return true;
    return lesson.status === statusFilter;
  });

  if (isLoading) return <div style={{ padding: '2rem' }}>Carregando conteúdo...</div>;
  if (!course) return null;

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto', textAlign: 'left', width: '100%' }}>
      {/* Cabeçalho do Curso Responsivo */}
      <div style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
        <button onClick={() => navigate('/dashboard')} style={{ marginBottom: '1rem', background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0 }}>
          ← Voltar aos Cursos
        </button>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ flex: '1 1 300px' }}>
            <h1 style={{ margin: 0 }}>{course.name}</h1>
            <p style={{ color: 'var(--text)', marginTop: '0.5rem', lineHeight: '1.5' }}>{course.description}</p>
          </div>

          {/* Integração de API Externa: Card do Instrutor Convidado */}
          {instructor && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--social-bg)', padding: '0.8rem 1.2rem', borderRadius: '50px', border: '1px solid var(--border)' }}>
              <img 
                src={instructor.picture} 
                alt={`Foto do instrutor ${instructor.name}`} 
                style={{ width: '40px', height: '40px', borderRadius: '50%' }}
              />
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Instrutor Convidado</div>
                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>Prof. {instructor.name}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controlos de Aulas (Filtro e Botão de Adicionar) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h3 style={{ margin: 0 }}>Conteúdo Programático ({filteredLessons.length})</h3>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          
          {/* Filtro de Aulas */}
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="counter"
            style={{ margin: 0, padding: '0.5rem', background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer' }}
          >
            <option value="all">Todas as Aulas</option>
            <option value="published">Apenas Publicadas</option>
            {canManage && <option value="draft">Apenas Rascunhos</option>}
          </select>

          {canManage && (
            <button onClick={() => setIsModalOpen(true)} className="counter" style={{ background: 'var(--accent)', color: 'white', margin: 0 }}>
              + Adicionar Aula
            </button>
          )}
        </div>
      </div>
      
      {/* Lista de Aulas Filtrada */}
      {filteredLessons.length === 0 ? (
        <p style={{ color: 'var(--text)', fontStyle: 'italic', background: 'var(--code-bg)', padding: '2rem', borderRadius: '8px', textAlign: 'center' }}>
          Nenhuma aula encontrada para o filtro atual.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredLessons.map((lesson, index) => (
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
                opacity: lesson.status === 'draft' ? 0.7 : 1,
                flexWrap: 'wrap',
                gap: '1rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--accent)', minWidth: '25px' }}>{index + 1}.</span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 500 }}>{lesson.title}</span>
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
                    <a href={lesson.video_url} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'none', display: 'inline-block', marginTop: '4px' }}>
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
                  aria-label="Excluir aula"
                >
                  🗑️
                </button>
              )}
            </div>
          ))}
        </div>
      )}

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