// frontend/src/components/TakeQuizModal.tsx
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import confetti from 'canvas-confetti';
import api from '../services/api';
import type {
  QuizResponse,
  QuizAttemptResponse,
  StudentAnswerResponse,
} from '../schemas/quiz';

interface TakeQuizModalProps {
  lessonId: number;
  onClose: () => void;
  onSuccess: () => void;
}

interface StudentAnswersState {
  [questionId: number]: {
    selected_option_id?: number;
    text_answer?: string;
  };
}

// ==========================================
// SUB-COMPONENTE: Linha de resposta no boletim
// ==========================================

interface AnswerRowProps {
  answer: StudentAnswerResponse;
  index: number;
  questionText: string;
}

function AnswerRow({ answer, index, questionText }: AnswerRowProps) {
  const isObjective = answer.is_correct !== null;
  const isPendingOpen = !isObjective && answer.manual_score === null;
  const isGradedOpen = !isObjective && answer.manual_score !== null;

  let statusNode: React.ReactNode;

  if (isObjective) {
    statusNode = answer.is_correct
      ? <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>✅ Correta</span>
      : <span style={{ color: '#ff4d4d', fontWeight: 'bold' }}>❌ Incorreta</span>;
  } else if (isPendingOpen) {
    statusNode = (
      <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>
        ⏳ Aguardando correção do professor
      </span>
    );
  } else if (isGradedOpen) {
    statusNode = (
      <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>
        ✏️ Nota: {answer.manual_score}/100
      </span>
    );
  }

  return (
    <div style={{
      padding: '0.8rem',
      borderBottom: '1px dashed var(--border)',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.4rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.8rem' }}>
        <span style={{ fontWeight: 'bold', minWidth: '20px', color: 'var(--text)' }}>
          {index + 1}.
        </span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: '0 0 0.3rem 0', fontSize: '14px', color: 'var(--text-h)' }}>
            {questionText}
          </p>
          {answer.text_answer && (
            <p style={{
              margin: '0 0 0.3rem 0',
              fontSize: '13px',
              color: 'var(--text)',
              fontStyle: 'italic',
              background: 'var(--bg)',
              padding: '0.4rem 0.6rem',
              borderRadius: '4px',
            }}>
              "{answer.text_answer}"
            </p>
          )}
          <div style={{ fontSize: '14px' }}>{statusNode}</div>
          {answer.teacher_feedback && (
            <div style={{
              marginTop: '0.4rem',
              padding: '0.5rem 0.8rem',
              background: 'var(--accent-bg)',
              borderLeft: '3px solid var(--accent)',
              borderRadius: '0 4px 4px 0',
              fontSize: '13px',
              color: 'var(--text)',
            }}>
              <strong>Feedback do professor:</strong> {answer.teacher_feedback}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export function TakeQuizModal({ lessonId, onClose, onSuccess }: TakeQuizModalProps) {
  const [quiz, setQuiz] = useState<QuizResponse | null>(null);
  const [attempt, setAttempt] = useState<QuizAttemptResponse | null>(null);
  const [answers, setAnswers] = useState<StudentAnswersState>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchQuizData = async () => {
      try {
        // 1. Verifica se o aluno já tem uma tentativa registada
        try {
          const attemptRes = await api.get(`/lessons/${lessonId}/quizzes/attempts/my`);
          setAttempt(attemptRes.data);
          const quizRes = await api.get(`/lessons/${lessonId}/quizzes`);
          setQuiz(quizRes.data);
          setIsLoading(false);
          return;
        } catch (err: unknown) {
          // 404 = ainda não fez a prova, continua normalmente
          if (isAxiosError(err) && err.response?.status !== 404) throw err;
        }

        // 2. Carrega a prova em branco
        const quizRes = await api.get(`/lessons/${lessonId}/quizzes`);
        setQuiz(quizRes.data);
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 404) {
          setNotFound(true);
        } else {
          toast.error('Erro ao carregar avaliação.');
          onClose();
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuizData();
  }, [lessonId, onClose]);

  const handleOptionChange = (questionId: number, optionId: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], selected_option_id: optionId },
    }));
  };

  const handleTextChange = (questionId: number, text: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], text_answer: text },
    }));
  };

  const handleSubmit = async () => {
    if (!quiz) return;

    const answeredCount = Object.keys(answers).length;
    if (answeredCount < quiz.questions.length) {
      if (!window.confirm('Ainda há questões em branco. Deseja entregar a prova mesmo assim?')) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        answers: Object.entries(answers).map(([qId, ans]) => ({
          question_id: Number(qId),
          ...ans,
        })),
      };

      const res = await api.post(`/lessons/${lessonId}/quizzes/attempts`, payload);
      const submittedAttempt: QuizAttemptResponse = res.data;
      setAttempt(submittedAttempt);

      if (submittedAttempt.status === 'pending_correction') {
        toast('Prova entregue! Aguarde a correção do professor.', { icon: '⏳' });
      } else if (submittedAttempt.score !== null && submittedAttempt.score >= 70) {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        toast.success(`Parabéns! Nota: ${submittedAttempt.score}%`, { icon: '🏆' });
      } else {
        toast.success('Avaliação entregue.');
      }

      onSuccess();
    } catch (error) {
      if (isAxiosError(error)) {
        toast.error(error.response?.data?.detail || 'Erro ao enviar avaliação.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── TELA DE CARREGAMENTO ──────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div style={overlayStyle}>
        <p style={{ color: 'white' }}>Carregando avaliação...</p>
      </div>
    );
  }

  // ── SEM AVALIAÇÃO ─────────────────────────────────────────────────────────

  if (notFound || !quiz) {
    return (
      <div style={overlayStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>Nenhuma Avaliação</h3>
          <p style={{ color: 'var(--text)', marginBottom: '1.5rem' }}>
            O professor ainda não publicou nenhuma avaliação para esta aula.
          </p>
          <button onClick={onClose} className="counter"
            style={{ background: 'var(--accent)', color: 'white', margin: 0 }}>
            Voltar
          </button>
        </div>
      </div>
    );
  }

  // ── TELA DE RESULTADO / BOLETIM ───────────────────────────────────────────

  if (attempt) {
    const isPending = attempt.status === 'pending_correction';
    const isApproved = attempt.score !== null && attempt.score >= 70;

    // Mapa para lookup rápido do enunciado por question_id
    const questionTextMap = Object.fromEntries(
      quiz.questions.map(q => [q.id, q.text])
    );

    return (
      <div style={overlayStyle}>
        <div style={{ ...cardStyle, maxWidth: '680px', textAlign: 'center' }}>

          {/* Header do boletim */}
          <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>
            {isPending ? '⏳' : isApproved ? '🎓' : '📚'}
          </div>
          <h2 style={{ margin: '0 0 0.3rem 0' }}>
            {isPending ? 'Aguardando Correção' : 'Boletim de Avaliação'}
          </h2>
          <p style={{ color: 'var(--text)', marginBottom: '1.5rem' }}>{quiz.title}</p>

          {/* Card de nota — mostra estado pendente se ainda não foi corrigida */}
          <div style={{
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'var(--social-bg)',
            padding: '1.2rem 2.5rem',
            borderRadius: '12px',
            marginBottom: '1.5rem',
            border: `2px solid ${isPending ? 'var(--accent-border)' : isApproved ? '#4caf50' : '#ff4d4d'}`,
          }}>
            <span style={{ fontSize: '12px', textTransform: 'uppercase', fontWeight: 'bold', color: 'var(--text)', letterSpacing: '1px' }}>
              Nota Final
            </span>
            {isPending ? (
              <span style={{ fontSize: '1.4rem', color: 'var(--accent)', fontWeight: 'bold', marginTop: '0.3rem' }}>
                Pendente
              </span>
            ) : (
              <span style={{ fontSize: '3rem', fontWeight: 'bold', color: isApproved ? '#2e7d32' : '#ff4d4d', lineHeight: 1 }}>
                {attempt.score}%
              </span>
            )}
          </div>

          {/* Banner informativo para provas pendentes */}
          {isPending && (
            <div style={{
              background: 'var(--accent-bg)',
              border: '1px solid var(--accent-border)',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.5rem',
              fontSize: '14px',
              color: 'var(--text)',
              textAlign: 'left',
            }}>
              <strong>ℹ️ Sua prova contém questões discursivas.</strong> A nota final será
              calculada após o professor corrigir as suas respostas abertas.
              Você pode fechar e verificar o resultado mais tarde.
            </div>
          )}

          {/* Detalhamento das respostas */}
          <div style={{
            background: 'var(--code-bg)',
            padding: '1rem',
            borderRadius: '8px',
            textAlign: 'left',
            marginBottom: '1.5rem',
            maxHeight: '280px',
            overflowY: 'auto',
          }}>
            <h4 style={{ margin: '0 0 0.8rem 0', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Detalhamento das Respostas
            </h4>
            {attempt.answers.map((ans: StudentAnswerResponse, index: number) => (
              <AnswerRow
                key={ans.id}
                answer={ans}
                index={index}
                questionText={questionTextMap[ans.question_id] ?? `Questão ${index + 1}`}
              />
            ))}
          </div>

          <button
            onClick={onClose}
            className="counter"
            style={{ background: 'var(--accent)', color: 'white', padding: '0.8rem 2.5rem', fontWeight: 'bold', margin: 0 }}
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  // ── TELA DE FAZER A PROVA ─────────────────────────────────────────────────

  return (
    <div style={overlayStyle}>
      <div style={{
        background: 'var(--bg)', padding: '2rem', borderRadius: '12px',
        width: '100%', maxWidth: '800px', border: '1px solid var(--border)',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 style={{ margin: '0 0 0.3rem 0' }}>{quiz.title}</h2>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text)' }}>
              {quiz.questions.length} questão(ões) · Apenas uma tentativa é permitida.
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text)', lineHeight: 1 }}>×</button>
        </div>

        {/* Corpo das questões */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {quiz.questions.map((question, index) => (
            <div key={question.id} style={{ background: 'var(--code-bg)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.2rem', alignItems: 'flex-start' }}>
                <span style={{ background: 'var(--accent)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 'bold', flexShrink: 0, fontSize: '13px' }}>
                  {index + 1}
                </span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 0.3rem 0', fontSize: '15px', lineHeight: 1.5, fontWeight: 500 }}>
                    {question.text}
                  </p>
                  <span style={{ fontSize: '12px', color: 'var(--text)', background: 'var(--bg)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                    {question.question_type === 'multiple_choice' ? '🔘 Múltipla Escolha' : '✍️ Discursiva'} · Peso {question.weight}
                  </span>
                </div>
              </div>

              {question.question_type === 'multiple_choice' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', paddingLeft: '2.5rem' }}>
                  {question.options.map(opt => {
                    const isSelected = answers[question.id]?.selected_option_id === opt.id;
                    return (
                      <label key={opt.id} style={{
                        display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer',
                        padding: '0.6rem 0.8rem', borderRadius: '6px',
                        background: isSelected ? 'var(--accent-bg)' : 'var(--bg)',
                        border: `1px solid ${isSelected ? 'var(--accent-border)' : 'var(--border)'}`,
                        transition: 'all 0.15s',
                      }}>
                        <input
                          type="radio"
                          name={`q_${question.id}`}
                          value={opt.id}
                          checked={isSelected}
                          onChange={() => handleOptionChange(question.id, opt.id)}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--accent)', flexShrink: 0 }}
                        />
                        <span style={{ fontSize: '14px' }}>{opt.text}</span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div style={{ paddingLeft: '2.5rem' }}>
                  <textarea
                    className="counter"
                    placeholder="Escreva a sua resposta aqui..."
                    value={answers[question.id]?.text_answer ?? ''}
                    onChange={(e) => handleTextChange(question.id, e.target.value)}
                    style={{ width: '100%', minHeight: '110px', resize: 'vertical', margin: 0, padding: '0.7rem', fontSize: '14px', lineHeight: 1.5, boxSizing: 'border-box' }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} disabled={isSubmitting} className="counter"
            style={{ background: 'transparent', border: '1px solid var(--border)', margin: 0 }}>
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={isSubmitting} className="counter"
            style={{ background: '#2e7d32', color: 'white', border: 'none', margin: 0, fontWeight: 'bold', padding: '0.8rem 2.5rem' }}>
            {isSubmitting ? 'Enviando...' : 'Finalizar Prova'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// ESTILOS REUTILIZÁVEIS
// ==========================================

const overlayStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.82)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, padding: '1rem',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--bg)', padding: '2rem', borderRadius: '12px',
  width: '100%', maxWidth: '500px',
  border: '1px solid var(--border)',
  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
};