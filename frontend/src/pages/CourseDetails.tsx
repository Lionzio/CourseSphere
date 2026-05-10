// frontend/src/pages/CourseDetails.tsx
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios, { isAxiosError } from 'axios';
import api from '../services/api';
import { useAuthStore } from '../stores/auth';
import { CreateLessonModal } from '../components/CreateLessonModal';
import { CreateMaterialModal } from '../components/CreateMaterialModal';
import { CreateQuizModal } from '../components/CreateQuizModal';
import { TakeQuizModal } from '../components/TakeQuizModal';
import { GradeQuizModal } from '../components/GradeQuizModal';
import type { Course } from '../schemas/course';
import type { Lesson } from '../schemas/lesson';
import type { Enrollment } from '../schemas/enrollment';
import type { Material } from '../schemas/material';

interface GuestInstructor {
  name: string;
  picture: string;
}

type StatusFilter = 'all' | 'published' | 'draft';

const getMaterialIcon = (type: string) => {
  switch (type) {
    case 'pdf':      return '📄';
    case 'video':    return '🎞️';
    case 'doc':      return '📝';
    case 'article': return '📰';
    default:         return '🔗';
  }
};

export function CourseDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [materialsRecord, setMaterialsRecord] = useState<Record<number, Material[]>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeLessonIdForMaterial, setActiveLessonIdForMaterial] = useState<number | null>(null);

  // Estados para os Modais de Avaliação
  const [activeLessonIdForQuiz, setActiveLessonIdForQuiz] = useState<number | null>(null);     // Professor: criar prova
  const [activeLessonIdForTakeQuiz, setActiveLessonIdForTakeQuiz] = useState<number | null>(null); // Aluno: fazer prova
  const [activeLessonIdForGrading, setActiveLessonIdForGrading] = useState<number | null>(null);  // Professor: corrigir provas

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [instructor, setInstructor] = useState<GuestInstructor | null>(null);

  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [completedLessons, setCompletedLessons] = useState<number[]>([]);
  const [completionPercentage, setCompletionPercentage] = useState<number>(0);

  const canManage = user?.role === 'teacher' || user?.role === 'admin';

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      const [courseRes, lessonsRes, enrollmentsRes] = await Promise.all([
        api.get(`/courses/${id}`),
        api.get(`/courses/${id}/lessons`),
        api.get('/enrollments/my'),
      ]);

      setCourse(courseRes.data);

      const fetchedLessons: Lesson[] = lessonsRes.data;
      const visibleLessons = canManage
        ? fetchedLessons
        : fetchedLessons.filter((l) => l.status === 'published');
      setLessons(visibleLessons);

      if (visibleLessons.length > 0) {
        const materialsResponses = await Promise.allSettled(
          visibleLessons.map((l) => api.get(`/lessons/${l.id}/materials`))
        );
        const newMaterialsRecord: Record<number, Material[]> = {};
        visibleLessons.forEach((lesson, index) => {
          const res = materialsResponses[index];
          newMaterialsRecord[lesson.id] =
            res.status === 'fulfilled' ? res.value.data : [];
        });
        setMaterialsRecord(newMaterialsRecord);
      }

      const currentEnrollment: Enrollment | undefined = enrollmentsRes.data.find(
        (e: Enrollment) => e.course_id === Number(id)
      );

      if (currentEnrollment) {
        setEnrollment(currentEnrollment);
        const progressRes = await api.get(`/enrollments/${currentEnrollment.id}/progress`);
        setCompletedLessons(progressRes.data.completed_lesson_ids);
        setCompletionPercentage(progressRes.data.completion_percentage);
      }
    } catch {
      toast.error('Erro ao carregar detalhes do curso.');
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  }, [id, canManage, navigate]);

  const fetchGuestInstructor = async () => {
    try {
      const res = await axios.get('https://randomuser.me/api/?inc=name,picture&nat=br');
      const data = res.data.results[0];
      setInstructor({
        name: `${data.name.first} ${data.name.last}`,
        picture: data.picture.medium,
      });
    } catch (error) {
      console.warn('API RandomUser indisponível.', error);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
    fetchGuestInstructor();
  }, [fetchData]);

  const handleDeleteLesson = async (lessonId: number) => {
    if (!window.confirm('Deseja realmente excluir esta aula?')) return;
    try {
      await api.delete(`/lessons/${lessonId}`);
      toast.success('Aula removida com sucesso.');
      fetchData();
    } catch {
      toast.error('Erro ao remover a aula.');
    }
  };

  const handleDeleteMaterial = async (materialId: number) => {
    if (!window.confirm('Excluir este material de apoio?')) return;
    try {
      await api.delete(`/materials/${materialId}`);
      toast.success('Material removido.');
      fetchData();
    } catch {
      toast.error('Erro ao remover material.');
    }
  };

  const handleMarkAsComplete = async (lessonId: number) => {
    if (!enrollment) return;
    try {
      await api.post(`/enrollments/${enrollment.id}/progress`, { lesson_id: lessonId });
      toast.success('Aula concluída!', { icon: '🏆' });
      const progressRes = await api.get(`/enrollments/${enrollment.id}/progress`);
      setCompletedLessons(progressRes.data.completed_lesson_ids);
      setCompletionPercentage(progressRes.data.completion_percentage);
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 409) {
        toast.error('Esta aula já foi concluída.');
      } else {
        toast.error('Erro ao registrar progresso.');
      }
    }
  };

  const filteredLessons = lessons.filter((lesson) =>
    statusFilter === 'all' ? true : lesson.status === statusFilter
  );

  if (isLoading) return <div style={{ padding: '2rem' }}>Carregando conteúdo...</div>;
  if (!course) return null;

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto', textAlign: 'left', width: '100%' }}>

      {/* ── CABEÇALHO DO CURSO ── */}
      <div style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{ marginBottom: '1rem', background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0 }}
        >
          ← Voltar ao Painel
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ flex: '1 1 300px' }}>
            <h1 style={{ margin: 0 }}>{course.name}</h1>
            <p style={{ color: 'var(--text)', marginTop: '0.5rem', lineHeight: '1.5' }}>{course.description}</p>
          </div>

          {instructor && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--social-bg)', padding: '0.8rem 1.2rem', borderRadius: '50px', border: '1px solid var(--border)' }}>
              <img src={instructor.picture} alt="Instrutor" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Instrutor Convidado</div>
                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>Prof. {instructor.name}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── BARRA DE PROGRESSO DO ALUNO ── */}
      {enrollment && !canManage && (
        <div style={{ marginBottom: '2rem', background: 'var(--bg)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px', fontWeight: 'bold' }}>
            <span style={{ color: 'var(--text)' }}>Seu Progresso</span>
            <span style={{ color: completionPercentage === 100 ? '#2e7d32' : 'var(--accent)' }}>
              {completionPercentage}%
            </span>
          </div>
          <div style={{ background: 'var(--social-bg)', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
            <div style={{
              background: completionPercentage === 100 ? '#2e7d32' : 'var(--accent)',
              height: '100%',
              width: `${completionPercentage}%`,
              transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            }} />
          </div>
        </div>
      )}

      {/* ── TOOLBAR: FILTRO + BOTÃO ADICIONAR AULA ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h3 style={{ margin: 0 }}>Conteúdo Programático ({filteredLessons.length})</h3>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
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
            <button
              onClick={() => setIsModalOpen(true)}
              className="counter"
              style={{ background: 'var(--accent)', color: 'white', margin: 0 }}
            >
              + Adicionar Aula
            </button>
          )}
        </div>
      </div>

      {/* ── LISTA DE AULAS ── */}
      {filteredLessons.length === 0 ? (
        <p style={{ color: 'var(--text)', fontStyle: 'italic', background: 'var(--code-bg)', padding: '2rem', borderRadius: '8px', textAlign: 'center' }}>
          Nenhuma aula encontrada para o filtro atual.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredLessons.map((lesson, index) => {
            const isCompleted = completedLessons.includes(lesson.id);
            const lessonMaterials = materialsRecord[lesson.id] ?? [];

            return (
              <div
                key={lesson.id}
                style={{
                  padding: '1rem', background: 'var(--code-bg)', borderRadius: '8px',
                  border: isCompleted ? '1px solid #2e7d32' : '1px solid var(--border)',
                  opacity: lesson.status === 'draft' ? 0.75 : 1,
                  transition: 'border 0.3s ease, opacity 0.3s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>

                  {/* Título e badge de status */}
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--accent)', minWidth: '25px', paddingTop: '2px' }}>
                      {index + 1}.
                    </span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 500, fontSize: '16px' }}>{lesson.title}</span>
                        {canManage && (
                          <span style={{
                            fontSize: '10px', padding: '2px 6px', borderRadius: '4px',
                            textTransform: 'uppercase',
                            background: lesson.status === 'published' ? '#2e7d32' : '#757575',
                            color: 'white',
                          }}>
                            {lesson.status === 'published' ? 'Publicada' : 'Rascunho'}
                          </span>
                        )}
                      </div>
                      {lesson.video_url && (
                        <a
                          href={lesson.video_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'none', display: 'inline-block' }}
                        >
                          📺 Assistir Vídeo
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Botões de ação */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>

                    {/* Botões do Professor */}
                    {canManage && (
                      <>
                        <button
                          onClick={() => setActiveLessonIdForMaterial(lesson.id)}
                          style={{ background: 'var(--social-bg)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '12px' }}
                        >
                          + Anexar Material
                        </button>
                        <button
                          onClick={() => setActiveLessonIdForQuiz(lesson.id)}
                          style={{ background: 'transparent', border: '1px dashed var(--accent)', color: 'var(--accent)', cursor: 'pointer', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}
                        >
                          📝 Criar Avaliação
                        </button>
                        <button
                          onClick={() => setActiveLessonIdForGrading(lesson.id)}
                          style={{ background: 'transparent', border: '1px solid #2e7d32', color: '#2e7d32', cursor: 'pointer', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}
                        >
                          📊 Corrigir Provas
                        </button>
                      </>
                    )}

                    {/* Botões do Aluno */}
                    {enrollment && !canManage && (
                      <>
                        <button
                          onClick={() => setActiveLessonIdForTakeQuiz(lesson.id)}
                          style={{ background: 'transparent', border: '1px dashed var(--accent)', color: 'var(--accent)', cursor: 'pointer', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}
                        >
                          📝 Avaliação
                        </button>
                        <button
                          onClick={() => handleMarkAsComplete(lesson.id)}
                          disabled={isCompleted}
                          style={{
                            background: isCompleted ? '#2e7d32' : 'transparent',
                            color: isCompleted ? 'white' : 'var(--text)',
                            border: isCompleted ? 'none' : '1px solid var(--border)',
                            cursor: isCompleted ? 'default' : 'pointer',
                            padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '12px',
                            fontWeight: 'bold', transition: 'all 0.3s ease',
                          }}
                        >
                          {isCompleted ? '✓ Concluída' : 'Marcar como Concluída'}
                        </button>
                      </>
                    )}

                    {/* Lixeira — Professor */}
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
                </div>

                {/* Materiais de apoio */}
                {lessonMaterials.length > 0 && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed var(--border)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--text)' }}>
                      Materiais de Apoio:
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {lessonMaterials.map((material) => (
                        <li
                          key={material.id}
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg)', padding: '0.5rem 0.8rem', borderRadius: '6px', fontSize: '13px' }}
                        >
                          <a
                            href={material.url}
                            target="_blank"
                            rel="noreferrer"
                            style={{ textDecoration: 'none', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}
                          >
                            {getMaterialIcon(material.type)} {material.title}
                          </a>
                          {canManage && (
                            <button
                              onClick={() => handleDeleteMaterial(material.id)}
                              style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer', padding: '0 0.5rem' }}
                              title="Remover Material"
                            >
                              ✖
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAIS DA APLICAÇÃO ── */}
      {isModalOpen && canManage && (
        <CreateLessonModal
          courseId={Number(id)}
          onClose={() => setIsModalOpen(false)}
          onSuccess={fetchData}
        />
      )}
      {activeLessonIdForMaterial !== null && canManage && (
        <CreateMaterialModal
          lessonId={activeLessonIdForMaterial}
          onClose={() => setActiveLessonIdForMaterial(null)}
          onSuccess={fetchData}
        />
      )}
      {/* Professor: Construir Prova */}
      {activeLessonIdForQuiz !== null && canManage && (
        <CreateQuizModal
          lessonId={activeLessonIdForQuiz}
          onClose={() => setActiveLessonIdForQuiz(null)}
          onSuccess={fetchData}
        />
      )}
      {/* Professor: Painel de Correção */}
      {activeLessonIdForGrading !== null && canManage && (
        <GradeQuizModal
          lessonId={activeLessonIdForGrading}
          onClose={() => setActiveLessonIdForGrading(null)}
        />
      )}
      {/* Aluno: Fazer a Prova / Ver Boletim */}
      {activeLessonIdForTakeQuiz !== null && !canManage && (
        <TakeQuizModal
          lessonId={activeLessonIdForTakeQuiz}
          onClose={() => setActiveLessonIdForTakeQuiz(null)}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}