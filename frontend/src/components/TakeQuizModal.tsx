import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import confetti from 'canvas-confetti';
import api from '../services/api';
import type { QuizResponse, QuizAttemptResponse, StudentAnswerResponse } from '../schemas/quiz';

interface TakeQuizModalProps {
  lessonId: number;
  onClose: () => void;
  onSuccess: () => void; // Pode ser usado para atualizar o progresso geral
}

// Tipagem local para o estado do gabarito do aluno
interface StudentAnswersState {
  [questionId: number]: {
    selected_option_id?: number;
    text_answer?: string;
  };
}

export function TakeQuizModal({ lessonId, onClose, onSuccess }: TakeQuizModalProps) {
  const [quiz, setQuiz] = useState<QuizResponse | null>(null);
  const [attempt, setAttempt] = useState<QuizAttemptResponse | null>(null); // Tipagem Resolvida!
  
  const [answers, setAnswers] = useState<StudentAnswersState>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchQuizData = async () => {
      try {
        // 1. Tenta buscar o boletim (se já fez a prova, paramos por aqui e mostramos o resultado)
        try {
          const attemptRes = await api.get(`/lessons/${lessonId}/quizzes/attempts/my`);
          setAttempt(attemptRes.data);
          
          // Busca também o quiz para sabermos os enunciados na tela de resultado
          const quizRes = await api.get(`/lessons/${lessonId}/quizzes`);
          setQuiz(quizRes.data);
          setIsLoading(false);
          return; 
        } catch (err: unknown) { // Tipagem de erro resolvida
          if (isAxiosError(err) && err.response?.status !== 404) {
            throw err; 
          }
          // Se for 404 no attempt, significa que ele ainda não fez a prova. Segue o jogo!
        }

        // 2. Busca a prova em branco para o aluno fazer
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
      [questionId]: { ...prev[questionId], selected_option_id: optionId }
    }));
  };

  const handleTextChange = (questionId: number, text: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], text_answer: text }
    }));
  };

  const handleSubmit = async () => {
    if (!quiz) return;

    // Validação de preenchimento (Opcional, mas boa prática)
    const answeredCount = Object.keys(answers).length;
    if (answeredCount < quiz.questions.length) {
      if (!window.confirm('Ainda há questões em branco. Deseja entregar a prova mesmo assim?')) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Formata o payload para o formato Pydantic esperado
      const payload = {
        answers: Object.entries(answers).map(([qId, ans]) => ({
          question_id: Number(qId),
          ...ans
        }))
      };

      const res = await api.post(`/lessons/${lessonId}/quizzes/attempts`, payload);
      setAttempt(res.data);
      
      // Efeito de Confete se a nota for boa! (Overdelivering)
      if (res.data.score >= 70) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#2e7d32', '#4caf50', '#ffd700']
        });
        toast.success(`Parabéns! Nota: ${res.data.score}%`, { icon: '🏆' });
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

  if (isLoading) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
        <p style={{ color: 'white' }}>Carregando avaliação...</p>
      </div>
    );
  }

  if (notFound || !quiz) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
        <div style={{ background: 'var(--bg)', padding: '2rem', borderRadius: '12px', textAlign: 'center', maxWidth: '400px' }}>
          <h3>Nenhuma Avaliação</h3>
          <p style={{ color: 'var(--text)', marginBottom: '1.5rem' }}>O professor ainda não publicou nenhuma avaliação para esta aula.</p>
          <button onClick={onClose} className="counter" style={{ background: 'var(--accent)', color: 'white', margin: 0 }}>Voltar</button>
        </div>
      </div>
    );
  }

  // TELA 1: RESULTADO (BOLETIM DE NOTAS)
  if (attempt) {
    const isApproved = attempt.score >= 70;
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
        <div style={{ background: 'var(--bg)', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '600px', border: '1px solid var(--border)', textAlign: 'center' }}>
          
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>
            {isApproved ? '🎓' : '📚'}
          </div>
          <h2 style={{ margin: '0 0 0.5rem 0' }}>Boletim de Avaliação</h2>
          <p style={{ color: 'var(--text)', marginBottom: '2rem' }}>{quiz.title}</p>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '2rem' }}>
            <div style={{ background: 'var(--social-bg)', padding: '1.5rem', borderRadius: '12px', minWidth: '150px' }}>
              <div style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text)', fontWeight: 'bold' }}>Nota Final</div>
              <div style={{ fontSize: '3rem', fontWeight: 'bold', color: isApproved ? '#2e7d32' : '#ff4d4d' }}>
                {attempt.score}%
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--code-bg)', padding: '1rem', borderRadius: '8px', textAlign: 'left', marginBottom: '2rem', maxHeight: '200px', overflowY: 'auto' }}>
            <h4 style={{ margin: '0 0 1rem 0' }}>Gabarito de Correção:</h4>
            {attempt.answers.map((ans: StudentAnswerResponse, index: number) => { // Tipagem do array resolvida
              const isObjective = ans.is_correct !== null;
              return (
                <div key={ans.id} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.5rem 0', borderBottom: '1px dashed var(--border)' }}>
                  <span style={{ fontWeight: 'bold', width: '20px' }}>{index + 1}.</span>
                  <span style={{ flex: 1, fontSize: '14px', color: 'var(--text)' }}>
                    {isObjective 
                      ? (ans.is_correct ? <span style={{ color: '#2e7d32' }}>✅ Resposta Correta</span> : <span style={{ color: '#ff4d4d' }}>❌ Resposta Incorreta</span>)
                      : <span style={{ color: 'var(--accent)' }}>⏳ Aguardando correção manual (Aberta)</span>
                    }
                  </span>
                </div>
              );
            })}
          </div>

          <button onClick={onClose} className="counter" style={{ background: 'var(--accent)', color: 'white', padding: '0.8rem 2rem', fontWeight: 'bold', margin: 0 }}>
            Fechar Boletim
          </button>
        </div>
      </div>
    );
  }

  // TELA 2: FAZER A PROVA
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div style={{ background: 'var(--bg)', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '800px', border: '1px solid var(--border)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 style={{ margin: 0 }}>{quiz.title}</h2>
            <div style={{ fontSize: '13px', color: 'var(--text)', marginTop: '4px' }}>Responda com atenção. Apenas uma tentativa é permitida.</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text)' }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '1rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {quiz.questions.map((question, index) => (
            <div key={question.id} style={{ background: 'var(--code-bg)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
              
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.2rem' }}>
                <span style={{ background: 'var(--accent)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 'bold', height: 'fit-content' }}>
                  {index + 1}
                </span>
                <p style={{ margin: 0, fontSize: '16px', lineHeight: '1.5', fontWeight: 500 }}>{question.text}</p>
              </div>

              {question.question_type === 'multiple_choice' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', paddingLeft: '2.5rem' }}>
                  {question.options.map(opt => (
                    <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer', padding: '0.5rem', borderRadius: '6px', background: answers[question.id]?.selected_option_id === opt.id ? 'var(--social-bg)' : 'transparent', transition: 'background 0.2s' }}>
                      <input 
                        type="radio" 
                        name={`q_${question.id}`} 
                        value={opt.id}
                        checked={answers[question.id]?.selected_option_id === opt.id}
                        onChange={() => handleOptionChange(question.id, opt.id)}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
                      />
                      <span style={{ fontSize: '15px' }}>{opt.text}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div style={{ paddingLeft: '2.5rem' }}>
                  <textarea 
                    className="counter"
                    placeholder="Escreva a sua resposta aqui..."
                    value={answers[question.id]?.text_answer || ''}
                    onChange={(e) => handleTextChange(question.id, e.target.value)}
                    style={{ width: '100%', minHeight: '100px', resize: 'vertical', margin: 0 }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} disabled={isSubmitting} className="counter" style={{ background: 'transparent', border: '1px solid var(--border)', margin: 0 }}>
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={isSubmitting} className="counter" style={{ background: '#2e7d32', color: 'white', border: 'none', margin: 0, fontWeight: 'bold', padding: '0.8rem 2.5rem' }}>
            {isSubmitting ? 'Enviando...' : 'Finalizar Prova'}
          </button>
        </div>

      </div>
    </div>
  );
}