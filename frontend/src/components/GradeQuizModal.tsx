// frontend/src/components/GradeQuizModal.tsx
import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import api from '../services/api';
import type {
  QuizResponse,
  QuizAttemptResponse,
  StudentAnswerResponse,
  QuizGradeUpdate,
  QuizGradeUpdateItem,
} from '../schemas/quiz';

interface GradeQuizModalProps {
  lessonId: number;
  onClose: () => void;
}

// ==========================================
// TIPOS LOCAIS
// ==========================================

/** Estado editável para as notas que o professor está preenchendo */
interface GradingState {
  [questionId: number]: {
    manual_score: string; // string para o input controlado
    teacher_feedback: string;
  };
}

// ==========================================
// SUB-COMPONENTE: Card de tentativa individual
// ==========================================

interface AttemptCardProps {
  attempt: QuizAttemptResponse;
  quiz: QuizResponse;
  isExpanded: boolean;
  onToggle: () => void;
  gradingState: GradingState;
  onGradeChange: (questionId: number, field: 'manual_score' | 'teacher_feedback', value: string) => void;
  onSubmitGrade: (attemptId: number) => Promise<void>;
  isSubmitting: boolean;
}

function AttemptCard({
  attempt,
  quiz,
  isExpanded,
  onToggle,
  gradingState,
  onGradeChange,
  onSubmitGrade,
  isSubmitting,
}: AttemptCardProps) {
  const isPending = attempt.status === 'pending_correction';
  const isGraded = attempt.status === 'graded';

  const questionMap = Object.fromEntries(quiz.questions.map(q => [q.id, q]));

  const openAnswers = attempt.answers.filter(
    (a: StudentAnswerResponse) => {
      const q = questionMap[a.question_id];
      return q?.question_type === 'open';
    }
  );

  const pendingOpenCount = openAnswers.filter(
    (a: StudentAnswerResponse) => a.manual_score === null
  ).length;

  return (
    <div style={{
      border: `1px solid ${isPending ? 'var(--accent-border)' : isGraded ? '#4caf50' : 'var(--border)'}`,
      borderRadius: '8px',
      overflow: 'hidden',
      background: 'var(--bg)',
    }}>
      {/* Header clicável do card */}
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', padding: '1rem 1.2rem',
          background: isPending ? 'var(--accent-bg)' : isGraded ? 'rgba(46,125,50,0.06)' : 'var(--social-bg)',
          border: 'none', cursor: 'pointer', textAlign: 'left', gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>
            {isPending ? '⏳' : isGraded ? '✅' : '📋'}
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-h)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Aluno #{attempt.user_id}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text)', marginTop: '2px' }}>
              {isPending
                ? `${pendingOpenCount} questão(ões) discursiva(s) pendentes`
                : isGraded
                  ? `Nota final: ${attempt.score}%`
                  : 'Em progresso'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexShrink: 0 }}>
          <span style={{
            fontSize: '11px', fontWeight: 'bold', padding: '3px 8px',
            borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.5px',
            background: isPending ? 'var(--accent)' : isGraded ? '#2e7d32' : 'gray',
            color: 'white',
          }}>
            {isPending ? 'Pendente' : isGraded ? 'Corrigida' : 'Em progresso'}
          </span>
          <span style={{ color: 'var(--text)', fontSize: '12px' }}>
            {isExpanded ? '▲' : '▼'}
          </span>
        </div>
      </button>

      {/* Corpo expansível */}
      {isExpanded && (
        <div style={{ padding: '1.2rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

          {/* Todas as respostas do aluno */}
          {attempt.answers.map((ans: StudentAnswerResponse, idx: number) => {
            const question = questionMap[ans.question_id];
            if (!question) return null;

            const isOpen = question.question_type === 'open';
            const isObjectiveCorrect = ans.is_correct === true;
            const isObjectiveWrong = ans.is_correct === false;

            return (
              <div key={ans.id} style={{
                background: 'var(--code-bg)', borderRadius: '6px',
                padding: '1rem', border: '1px solid var(--border)',
              }}>
                {/* Enunciado */}
                <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '0.8rem', alignItems: 'flex-start' }}>
                  <span style={{
                    background: 'var(--accent)', color: 'white', padding: '2px 7px',
                    borderRadius: '4px', fontWeight: 'bold', fontSize: '12px', flexShrink: 0,
                  }}>
                    {idx + 1}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 500, color: 'var(--text-h)' }}>
                      {question.text}
                    </p>
                    <span style={{ fontSize: '11px', color: 'var(--text)', background: 'var(--bg)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                      {isOpen ? '✍️ Discursiva' : '🔘 Múltipla Escolha'} · Peso {question.weight}
                    </span>
                  </div>
                </div>

                {/* Resposta do aluno */}
                <div style={{ marginBottom: '0.8rem', paddingLeft: '1.8rem' }}>
                  {isOpen ? (
                    <div style={{
                      background: 'var(--bg)', border: '1px solid var(--border)',
                      borderRadius: '6px', padding: '0.7rem', fontSize: '14px',
                      color: 'var(--text-h)', lineHeight: 1.5, fontStyle: 'italic',
                    }}>
                      {ans.text_answer || <span style={{ color: 'var(--text)', fontStyle: 'italic' }}>Sem resposta.</span>}
                    </div>
                  ) : (
                    <div style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {isObjectiveCorrect && <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>✅ Resposta correta</span>}
                      {isObjectiveWrong && <span style={{ color: '#ff4d4d', fontWeight: 'bold' }}>❌ Resposta incorreta</span>}
                    </div>
                  )}
                </div>

                {/* Painel de correção manual — apenas para questões abertas e tentativas pendentes */}
                {isOpen && isPending && (
                  <div style={{ paddingLeft: '1.8rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                      <div style={{ flex: '0 0 120px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: 'var(--text)' }}>
                          Nota (0–100) <span style={{ color: 'red' }}>*</span>
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={1}
                          value={gradingState[ans.question_id]?.manual_score ?? ''}
                          onChange={(e) => onGradeChange(ans.question_id, 'manual_score', e.target.value)}
                          placeholder="Ex: 85"
                          className="counter"
                          style={{ width: '100%', margin: 0, padding: '0.5rem', fontSize: '14px', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: 'var(--text)' }}>
                          Feedback para o aluno
                        </label>
                        <input
                          type="text"
                          value={gradingState[ans.question_id]?.teacher_feedback ?? ''}
                          onChange={(e) => onGradeChange(ans.question_id, 'teacher_feedback', e.target.value)}
                          placeholder="Ex: Boa resposta, mas faltou aprofundar..."
                          className="counter"
                          style={{ width: '100%', margin: 0, padding: '0.5rem', fontSize: '14px', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Exibe nota e feedback já atribuídos (tentativa já corrigida) */}
                {isOpen && isGraded && ans.manual_score !== null && (
                  <div style={{ paddingLeft: '1.8rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ fontSize: '13px', color: '#2e7d32', fontWeight: 'bold' }}>
                      ✏️ Nota atribuída: {ans.manual_score}/100
                    </div>
                    {ans.teacher_feedback && (
                      <div style={{
                        fontSize: '13px', padding: '0.5rem 0.8rem',
                        background: 'var(--accent-bg)', borderLeft: '3px solid var(--accent)',
                        borderRadius: '0 4px 4px 0', color: 'var(--text)',
                      }}>
                        <strong>Feedback:</strong> {ans.teacher_feedback}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Botão de submissão — apenas para tentativas pendentes */}
          {isPending && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px dashed var(--border)' }}>
              <button
                onClick={() => onSubmitGrade(attempt.id)}
                disabled={isSubmitting}
                className="counter"
                style={{
                  margin: 0, background: '#2e7d32', color: 'white',
                  border: 'none', fontWeight: 'bold', padding: '0.7rem 2rem',
                  opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer',
                }}
              >
                {isSubmitting ? 'Salvando...' : '✔ Fechar Correção'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export function GradeQuizModal({ lessonId, onClose }: GradeQuizModalProps) {
  const [quiz, setQuiz] = useState<QuizResponse | null>(null);
  const [attempts, setAttempts] = useState<QuizAttemptResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedAttemptId, setExpandedAttemptId] = useState<number | null>(null);
  // gradingStates: um estado de notas separado por tentativa
  const [gradingStates, setGradingStates] = useState<Record<number, GradingState>>({});

  const fetchData = useCallback(async () => {
    try {
      const [quizRes, attemptsRes] = await Promise.all([
        api.get(`/lessons/${lessonId}/quizzes`),
        api.get(`/lessons/${lessonId}/quizzes/attempts`),
      ]);
      const fetchedQuiz: QuizResponse = quizRes.data;
      const fetchedAttempts: QuizAttemptResponse[] = attemptsRes.data;

      setQuiz(fetchedQuiz);
      setAttempts(fetchedAttempts);

      // Pré-popula as notas já existentes para tentativas pendentes
      const initialStates: Record<number, GradingState> = {};
      for (const attempt of fetchedAttempts) {
        if (attempt.status === 'pending_correction') {
          const state: GradingState = {};
          for (const ans of attempt.answers) {
            const question = fetchedQuiz.questions.find(q => q.id === ans.question_id);
            if (question?.question_type === 'open') {
              state[ans.question_id] = {
                manual_score: ans.manual_score !== null ? String(ans.manual_score) : '',
                teacher_feedback: ans.teacher_feedback ?? '',
              };
            }
          }
          initialStates[attempt.id] = state;
        }
      }
      setGradingStates(initialStates);

      // Auto-expande a primeira tentativa pendente
      const firstPending = fetchedAttempts.find(a => a.status === 'pending_correction');
      if (firstPending) setExpandedAttemptId(firstPending.id);

    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        toast.error('Esta aula não possui uma avaliação publicada.');
      } else {
        toast.error('Erro ao carregar tentativas.');
      }
      onClose();
    } finally {
      setIsLoading(false);
    }
  }, [lessonId, onClose]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const handleGradeChange = (
    attemptId: number,
    questionId: number,
    field: 'manual_score' | 'teacher_feedback',
    value: string,
  ) => {
    setGradingStates(prev => ({
      ...prev,
      [attemptId]: {
        ...prev[attemptId],
        [questionId]: {
          ...prev[attemptId]?.[questionId],
          [field]: value,
        },
      },
    }));
  };

  const handleSubmitGrade = async (attemptId: number) => {
    if (!quiz) return;

    const state = gradingStates[attemptId] ?? {};

    // Valida se todos os campos de nota foram preenchidos
    const openQuestionIds = Object.keys(state).map(Number);
    for (const qId of openQuestionIds) {
      const score = state[qId]?.manual_score;
      if (score === '' || score === undefined) {
        toast.error('Preencha a nota de todas as questões discursivas antes de fechar.');
        return;
      }
      const scoreNum = Number(score);
      if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
        toast.error('As notas devem ser valores entre 0 e 100.');
        return;
      }
    }

    const grades: QuizGradeUpdateItem[] = openQuestionIds.map(qId => ({
      question_id: qId,
      manual_score: Number(state[qId].manual_score),
      teacher_feedback: state[qId].teacher_feedback ?? '',
    }));

    const payload: QuizGradeUpdate = { grades };

    setIsSubmitting(true);
    try {
      await api.patch(
        `/lessons/${lessonId}/quizzes/attempts/${attemptId}/grade`,
        payload,
      );
      toast.success('Correção enviada com sucesso!', { icon: '✔' });
      // Recarrega as tentativas para refletir o novo status
      await fetchData();
      setExpandedAttemptId(null);
    } catch (error) {
      if (isAxiosError(error)) {
        toast.error(error.response?.data?.detail || 'Erro ao enviar correção.');
      } else {
        toast.error('Erro inesperado.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── CONTADORES PARA O HEADER ──────────────────────────────────────────────
  const pendingCount = attempts.filter(a => a.status === 'pending_correction').length;
  const gradedCount = attempts.filter(a => a.status === 'graded').length;

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.82)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '1rem',
    }}>
      <div style={{
        background: 'var(--bg)', borderRadius: '12px', width: '100%', maxWidth: '780px',
        border: '1px solid var(--border)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
      }}>

        {/* ── HEADER ── */}
        <div style={{
          padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem',
        }}>
          <div>
            <h2 style={{ margin: '0 0 0.3rem 0' }}>Painel de Correção</h2>
            {quiz && (
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text)' }}>
                {quiz.title}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
            {/* Badges de contagem */}
            {!isLoading && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {pendingCount > 0 && (
                  <span style={{ background: 'var(--accent)', color: 'white', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                    ⏳ {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
                  </span>
                )}
                {gradedCount > 0 && (
                  <span style={{ background: '#2e7d32', color: 'white', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                    ✅ {gradedCount} corrigida{gradedCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.6rem', cursor: 'pointer', color: 'var(--text)', lineHeight: 1 }}>×</button>
          </div>
        </div>

        {/* ── CORPO ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {isLoading ? (
            <p style={{ textAlign: 'center', color: 'var(--text)', padding: '2rem' }}>
              Carregando tentativas...
            </p>
          ) : attempts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--code-bg)', borderRadius: '8px', border: '1px dashed var(--border)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.8rem' }}>📭</div>
              <p style={{ color: 'var(--text)', margin: 0 }}>
                Nenhum aluno submeteu esta avaliação ainda.
              </p>
            </div>
          ) : (
            <>
              {/* Pendentes primeiro */}
              {attempts
                .slice()
                .sort((a, b) => {
                  // pending_correction → graded → in_progress
                  const order = { pending_correction: 0, graded: 1, in_progress: 2 };
                  return (order[a.status] ?? 9) - (order[b.status] ?? 9);
                })
                .map(attempt => (
                  <AttemptCard
                    key={attempt.id}
                    attempt={attempt}
                    quiz={quiz!}
                    isExpanded={expandedAttemptId === attempt.id}
                    onToggle={() => setExpandedAttemptId(
                      expandedAttemptId === attempt.id ? null : attempt.id
                    )}
                    gradingState={gradingStates[attempt.id] ?? {}}
                    onGradeChange={(qId, field, val) => handleGradeChange(attempt.id, qId, field, val)}
                    onSubmitGrade={handleSubmitGrade}
                    isSubmitting={isSubmitting}
                  />
                ))
              }
            </>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div style={{ padding: '1rem 2rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="counter"
            style={{ margin: 0, background: 'transparent', border: '1px solid var(--border)' }}>
            Fechar Painel
          </button>
        </div>
      </div>
    </div>
  );
}