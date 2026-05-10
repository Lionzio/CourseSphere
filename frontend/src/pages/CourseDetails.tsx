// frontend/src/pages/CourseDetails.tsx
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios, { isAxiosError } from 'axios';
import ReactMarkdown from 'react-markdown';
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

// Interface local para tipar a lista de Quizzes (Refatoração 1:N)
interface LocalQuizResponse {
  id: number;
  lesson_id: number;
  title: string;
  weight: number;
}

type StatusFilter = 'all' | 'published' | 'draft';

const getMaterialIcon = (type: string) => {
  switch (type) {
    case 'pdf':      return '📄';
    case 'video':    return '🎞️';
    case 'doc':      return '📝';
    case 'article':  return '📰';
    default:         return '🔗';
  }
};

// ==========================================
// SUB-COMPONENTE: Skeleton Loader para IA
// ==========================================
const AILoadingSkeleton = () => (
  <div style={{ 
    padding: '1.5rem', 
    border: '1px solid var(--accent-border)', 
    borderRadius: '8px', 
    background: 'var(--social-bg)', 
    animation: 'pulse 1.5s infinite ease-in-out' 
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.2rem' }}>
      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent)', opacity: 0.5 }}></div>
      <div style={{ height: '16px', background: 'var(--border)', borderRadius: '4px', width: '30%' }}></div>
    </div>
    <div style={{ height: '12px', background: 'var(--border)', borderRadius: '4px', width: '100%', marginBottom: '0.6rem' }}></div>
    <div style={{ height: '12px', background: 'var(--border)', borderRadius: '4px', width: '90%', marginBottom: '0.6rem' }}></div>
    <div style={{ height: '12px', background: 'var(--border)', borderRadius: '4px', width: '95%', marginBottom: '1.2rem' }}></div>
    <div style={{ height: '12px', background: 'var(--border)', borderRadius: '4px', width: '60%' }}></div>
    <style>
      {`
        @keyframes pulse {
          0% { opacity: 0.5; }
          50% { opacity: 1; }
          100% { opacity: 0.5; }
        }
      `}
    </style>
  </div>
);

// ==========================================
// RENDERIZADOR MARKDOWN (Otimizado)
// ==========================================
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
const markdownComponents: any = {
  h1: ({ node: _node, ...props }: any) => <h1 style={{ fontSize: '1.4rem', color: 'var(--accent)', marginTop: 0, marginBottom: '0.8rem' }} {...props} />,
  h2: ({ node: _node, ...props }: any) => <h2 style={{ fontSize: '1.2rem', color: 'var(--text-h)', marginTop: '1.2rem', marginBottom: '0.6rem' }} {...props} />,
  h3: ({ node: _node, ...props }: any) => <h3 style={{ fontSize: '1.1rem', color: 'var(--text-h)', marginTop: '1rem', marginBottom: '0.5rem' }} {...props} />,
  p:  ({ node: _node, ...props }: any) => <p style={{ lineHeight: 1.6, marginBottom: '1rem' }} {...props} />,
  ul: ({ node: _node, ...props }: any) => <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }} {...props} />,
  ol: ({ node: _node, ...props }: any) => <ol style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }} {...props} />,
  li: ({ node: _node, ...props }: any) => <li style={{ marginBottom: '0.4rem', lineHeight: 1.5 }} {...props} />,
  strong: ({ node: _node, ...props }: any) => <strong style={{ color: 'var(--accent)' }} {...props} />
};
/* eslint-enable @typescript-eslint/no-unused-vars */
/* eslint-enable @typescript-eslint/no-explicit-any */

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
export function CourseDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [materialsRecord, setMaterialsRecord] = useState<Record<number, Material[]>>({});
  
  // Novo Estado para suportar Múltiplos Quizzes por aula (Sprint 8)
  const [quizzesRecord, setQuizzesRecord] = useState<Record<number, LocalQuizResponse[]>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeLessonIdForMaterial, setActiveLessonIdForMaterial] = useState<number | null>(null);
  const [activeLessonIdForQuiz, setActiveLessonIdForQuiz] = useState<number | null>(null);

  // Estados com contexto de Aula + Quiz (Preparação para Atualização dos Modais)
  const [activeQuizForTake, setActiveQuizForTake] = useState<{ lessonId: number; quizId: number } | null>(null);
  const [activeQuizForGrading, setActiveQuizForGrading] = useState<{ lessonId: number; quizId: number } | null>(null);

  const [isGeneratingAI, setIsGeneratingAI] = useState<Record<number, boolean>>({});

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
        // Fetch de Materiais
        const materialsResponses = await Promise.allSettled(
          visibleLessons.map((l) => api.get(`/lessons/${l.id}/materials`))
        );
        const newMaterialsRecord: Record<number, Material[]> = {};
        
        // Fetch de Quizzes (Novo Suporte 1:N)
        const quizzesResponses = await Promise.allSettled(
          visibleLessons.map((l) => api.get(`/lessons/${l.id}/quizzes`))
        );
        const newQuizzesRecord: Record<number, LocalQuizResponse[]> = {};

        visibleLessons.forEach((lesson, index) => {
          const matRes = materialsResponses[index];
          newMaterialsRecord[lesson.id] = matRes.status === 'fulfilled' ? matRes.value.data : [];

          const quizRes = quizzesResponses[index];
          newQuizzesRecord[lesson.id] = quizRes.status === 'fulfilled' ? quizRes.value.data : [];
        });

        setMaterialsRecord(newMaterialsRecord);
        setQuizzesRecord(newQuizzesRecord);
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

  // ==========================================
  // MANIPULADORES DE AÇÕES
  // ==========================================
  const handleGenerateAISummary = async (lessonId: number) => {
    setIsGeneratingAI(prev => ({ ...prev, [lessonId]: true }));
    try {
      await api.post(`/lessons/${lessonId}/ai-summary`);
      toast.success('Smart Summary gerado com sucesso!', { icon: '✨' });
      fetchData(); 
    } catch (error) {
      if (isAxiosError(error)) {
        toast.error(error.response?.data?.detail || 'Erro ao gerar resumo pela IA.');
      } else {
        toast.error('Erro inesperado na Inteligência Artificial.');
      }
    } finally {
      setIsGeneratingAI(prev => ({ ...prev, [lessonId]: false }));
    }
  };

  const handleDownloadSummaryPDF = async (lessonId: number, lessonTitle: string) => {
    const toastId = toast.loading('A preparar o PDF...', { icon: '⏳' });
    try {
      // Configuração para processar StreamingResponse do FastAPI
      const response = await api.get(`/lessons/${lessonId}/pdf-summary`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Resumo_${lessonTitle.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF transferido com sucesso!', { id: toastId, icon: '📥' });
    } catch {
      // Correção do linter: bloco catch vazio já que o 'error' não é usado internamente
      toast.error('Não foi possível transferir o PDF.', { id: toastId });
    }
  };

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

  const handleDeleteQuiz = async (lessonId: number, quizId: number) => {
    if (!window.confirm('Excluir esta avaliação permanentemente? Todos os boletins dos alunos serão perdidos.')) return;
    try {
      await api.delete(`/lessons/${lessonId}/quizzes/${quizId}`);
      toast.success('Avaliação removida com sucesso.');
      fetchData();
    } catch {
      toast.error('Erro ao remover avaliação.');
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
        <button onClick={() => navigate('/dashboard')} style={{ marginBottom: '1rem', background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0 }}>
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

      {/* ── TOOLBAR ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h3 style={{ margin: 0 }}>Conteúdo Programático ({filteredLessons.length})</h3>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className="counter" style={{ margin: 0, padding: '0.5rem', background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer' }}>
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
            const lessonQuizzes = quizzesRecord[lesson.id] ?? []; // Múltiplos Quizzes

            return (
              <div key={lesson.id} style={{
                padding: '1.5rem', background: 'var(--code-bg)', borderRadius: '12px',
                border: isCompleted ? '1px solid #2e7d32' : '1px solid var(--border)',
                opacity: lesson.status === 'draft' ? 0.75 : 1,
                transition: 'border 0.3s ease, opacity 0.3s ease',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>

                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--accent)', minWidth: '25px', paddingTop: '2px', fontSize: '1.2rem' }}>
                      {index + 1}.
                    </span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '18px' }}>{lesson.title}</span>
                        {canManage && (
                          <span style={{
                            fontSize: '10px', padding: '3px 8px', borderRadius: '12px',
                            textTransform: 'uppercase', fontWeight: 'bold',
                            background: lesson.status === 'published' ? '#2e7d32' : '#757575', color: 'white',
                          }}>
                            {lesson.status === 'published' ? 'Publicada' : 'Rascunho'}
                          </span>
                        )}
                      </div>
                      {lesson.video_url && (
                        <a href={lesson.video_url} target="_blank" rel="noreferrer" style={{ fontSize: '13px', color: 'var(--accent)', textDecoration: 'none', display: 'inline-block', fontWeight: 500 }}>
                          📺 Assistir Vídeo da Aula
                        </a>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
                    {canManage && (
                      <>
                        <button onClick={() => setActiveLessonIdForMaterial(lesson.id)} style={{ background: 'var(--social-bg)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                          + Material
                        </button>
                        <button onClick={() => setActiveLessonIdForQuiz(lesson.id)} style={{ background: 'transparent', border: '1px dashed var(--accent)', color: 'var(--accent)', cursor: 'pointer', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                          📝 + Avaliação
                        </button>
                      </>
                    )}
                    {enrollment && !canManage && (
                      <button onClick={() => handleMarkAsComplete(lesson.id)} disabled={isCompleted} style={{
                        background: isCompleted ? '#2e7d32' : 'transparent',
                        color: isCompleted ? 'white' : 'var(--text)',
                        border: isCompleted ? 'none' : '1px solid var(--border)',
                        cursor: isCompleted ? 'default' : 'pointer',
                        padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '12px',
                        fontWeight: 'bold', transition: 'all 0.3s ease',
                      }}>
                        {isCompleted ? '✓ Concluída' : 'Concluir Aula'}
                      </button>
                    )}
                    {canManage && (
                      <button onClick={() => handleDeleteLesson(lesson.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }} title="Excluir aula">🗑️</button>
                    )}
                  </div>
                </div>

                {/* ── SEÇÃO: MATERIAIS DE APOIO ── */}
                {lessonMaterials.length > 0 && (
                  <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px dashed var(--border)' }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '0.8rem', color: 'var(--text)' }}>
                      Materiais de Apoio:
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {lessonMaterials.map((material) => (
                        <li key={material.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg)', padding: '0.6rem 1rem', borderRadius: '6px', fontSize: '14px' }}>
                          <a href={material.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                            {getMaterialIcon(material.type)} {material.title}
                          </a>
                          {canManage && (
                            <button onClick={() => handleDeleteMaterial(material.id)} style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer', padding: '0 0.5rem', fontSize: '16px' }} title="Remover Material">✖</button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* ── SEÇÃO: AVALIAÇÕES MÚLTIPLAS (SPRINT 8) ── */}
                {lessonQuizzes.length > 0 && (
                  <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px dashed var(--border)' }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '0.8rem', color: 'var(--text)' }}>
                      Avaliações Disponíveis:
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {lessonQuizzes.map((quiz) => (
                        <li key={quiz.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg)', padding: '0.6rem 1rem', borderRadius: '6px', fontSize: '14px', borderLeft: '3px solid var(--accent)' }}>
                          <span style={{ color: 'var(--text-h)', fontWeight: 600 }}>📝 {quiz.title}</span>
                          
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {canManage ? (
                              <>
                                <button onClick={() => setActiveQuizForGrading({ lessonId: lesson.id, quizId: quiz.id })} style={{ background: 'transparent', border: '1px solid #2e7d32', color: '#2e7d32', cursor: 'pointer', padding: '0.3rem 0.8rem', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                                  📊 Corrigir Provas
                                </button>
                                <button onClick={() => handleDeleteQuiz(lesson.id, quiz.id)} style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer', padding: '0 0.5rem', fontSize: '16px' }} title="Remover Avaliação">✖</button>
                              </>
                            ) : (
                              <button onClick={() => setActiveQuizForTake({ lessonId: lesson.id, quizId: quiz.id })} style={{ background: 'transparent', border: '1px dashed var(--accent)', color: 'var(--accent)', cursor: 'pointer', padding: '0.3rem 0.8rem', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                                📝 Fazer Prova / Ver Boletim
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* ── INTEGRAÇÃO IA E EXPORTAÇÃO DE PDF (SPRINT 8) ── */}
                {(lesson.ai_summary || canManage || isGeneratingAI[lesson.id]) && (
                  <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px dashed var(--border)' }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--text)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>✨ Resumo Inteligente (AI)</span>
                      
                      {/* Botão de Exportação para PDF injetado aqui */}
                      {lesson.ai_summary && (
                        <button
                          onClick={() => handleDownloadSummaryPDF(lesson.id, lesson.title)}
                          style={{
                            background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)',
                            padding: '0.3rem 0.8rem', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer',
                          }}
                        >
                          📥 Exportar PDF
                        </button>
                      )}
                    </div>

                    {isGeneratingAI[lesson.id] ? (
                      <AILoadingSkeleton />
                    ) : lesson.ai_summary ? (
                      <div style={{
                        background: 'var(--social-bg)', padding: '1.5rem', borderRadius: '8px',
                        fontSize: '15px', color: 'var(--text-h)', border: '1px solid var(--accent-border)'
                      }}>
                        <ReactMarkdown components={markdownComponents}>
                          {lesson.ai_summary}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      canManage && (
                        <button
                          onClick={() => handleGenerateAISummary(lesson.id)}
                          className="counter"
                          style={{
                            background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)',
                            padding: '0.6rem 1.2rem', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', 
                            cursor: 'pointer', margin: 0, transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--accent)';
                            e.currentTarget.style.color = 'white';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--accent)';
                          }}
                        >
                          ✨ Gerar Resumo com Gemini
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modais */}
      {isModalOpen && canManage && <CreateLessonModal courseId={Number(id)} onClose={() => setIsModalOpen(false)} onSuccess={fetchData} />}
      {activeLessonIdForMaterial !== null && canManage && <CreateMaterialModal lessonId={activeLessonIdForMaterial} onClose={() => setActiveLessonIdForMaterial(null)} onSuccess={fetchData} />}
      
      {/* Modal de Criação mantém apenas lessonId, cria novo quiz associado à aula */}
      {activeLessonIdForQuiz !== null && canManage && <CreateQuizModal lessonId={activeLessonIdForQuiz} onClose={() => setActiveLessonIdForQuiz(null)} onSuccess={fetchData} />}
      
      {/* Modais de consumo são alimentados com lessonId e quizId (Ignorados no Linter temporariamente) */}
      {activeQuizForGrading !== null && canManage && (
        // @ts-expect-error - Refatoração Sprint 8: quizId será incorporado no GradeQuizModal na próxima etapa
        <GradeQuizModal lessonId={activeQuizForGrading.lessonId} quizId={activeQuizForGrading.quizId} onClose={() => setActiveQuizForGrading(null)} />
      )}
      {activeQuizForTake !== null && !canManage && (
        // @ts-expect-error - Refatoração Sprint 8: quizId será incorporado no TakeQuizModal na próxima etapa
        <TakeQuizModal lessonId={activeQuizForTake.lessonId} quizId={activeQuizForTake.quizId} onClose={() => setActiveQuizForTake(null)} onSuccess={fetchData} />
      )}
    </div>
  );
}