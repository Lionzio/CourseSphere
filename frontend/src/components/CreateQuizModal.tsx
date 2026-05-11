// frontend/src/components/CreateQuizModal.tsx
import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import type {
  Control,
  UseFormRegister,
  FieldErrors,
  UseFormWatch,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import api from '../services/api';
import { quizSchema, type QuizFormValues } from '../schemas/quiz';
import type { AIQuizSchema } from '../schemas/ai_quiz';

// ==========================================
// SUB-COMPONENTE: Item de Questão (Isolamento de Hook)
// ==========================================

interface QuestionItemProps {
  control: Control<QuizFormValues>;
  register: UseFormRegister<QuizFormValues>;
  index: number;
  removeQuestion: (index: number) => void;
  errors: FieldErrors<QuizFormValues>;
  watch: UseFormWatch<QuizFormValues>;
}

function QuestionItem({
  control,
  register,
  index,
  removeQuestion,
  errors,
  watch,
}: QuestionItemProps) {
  const {
    fields: optionFields,
    append: appendOption,
    remove: removeOption,
  } = useFieldArray({
    control,
    name: `questions.${index}.options` as const,
    // BUGFIX: Impede que o React Hook Form destrua o array 'options' quando a interface é escondida!
    shouldUnregister: false,
  });

  const questionType = watch(`questions.${index}.question_type` as const);
  const questionErrors = errors.questions?.[index];

  return (
    <div
      style={{
        background: 'var(--code-bg)',
        padding: '1.5rem',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <h4 style={{ margin: 0, color: 'var(--accent)' }}>Questão {index + 1}</h4>
        <button
          type="button"
          onClick={() => removeQuestion(index)}
          style={{
            background: 'none',
            border: 'none',
            color: '#ff4d4d',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          🗑️ Remover Questão
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Enunciado</label>
          <textarea
            {...register(`questions.${index}.text` as const)}
            className="counter"
            style={{
              width: '100%',
              margin: '0.3rem 0 0',
              minHeight: '60px',
              resize: 'vertical',
            }}
            placeholder="Qual é a capital de..."
          />
          {questionErrors?.text && (
            <span style={{ color: '#ff4d4d', fontSize: '12px' }}>
              {questionErrors.text.message}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Tipo</label>
            <select
              {...register(`questions.${index}.question_type` as const)}
              className="counter"
              style={{
                width: '100%',
                margin: '0.3rem 0 0',
                background: 'var(--bg)',
                color: 'var(--text)',
              }}
            >
              <option value="multiple_choice">Múltipla Escolha</option>
              <option value="open">Aberta / Discursiva</option>
            </select>
          </div>

          <div style={{ flex: '1 1 100px' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Peso (Nota)</label>
            <input
              type="number"
              step="0.1"
              {...register(`questions.${index}.weight` as const, { valueAsNumber: true })}
              className="counter"
              style={{ width: '100%', margin: '0.3rem 0 0' }}
            />
            {questionErrors?.weight && (
              <span style={{ color: '#ff4d4d', fontSize: '12px' }}>
                {questionErrors.weight.message}
              </span>
            )}
          </div>
        </div>

        {questionType === 'multiple_choice' && (
          <div
            style={{
              marginTop: '0.5rem',
              padding: '1rem',
              background: 'var(--bg)',
              borderRadius: '6px',
              border: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.8rem',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Alternativas</span>
              <button
                type="button"
                onClick={() => appendOption({ text: '', is_correct: false })}
                style={{
                  fontSize: '12px',
                  background: 'transparent',
                  border: '1px solid var(--accent)',
                  color: 'var(--text)',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                + Adicionar Alternativa
              </button>
            </div>

            {questionErrors?.options?.root && (
              <div
                style={{
                  color: '#ff4d4d',
                  fontSize: '12px',
                  marginBottom: '0.5rem',
                }}
              >
                {questionErrors.options.root.message}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {optionFields.map((opt, optIndex) => (
                <div
                  key={opt.id}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <input
                    type="checkbox"
                    {...register(
                      `questions.${index}.options.${optIndex}.is_correct` as const
                    )}
                    title="Marcar como alternativa correta"
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <input
                    {...register(`questions.${index}.options.${optIndex}.text` as const)}
                    className="counter"
                    placeholder="Texto da alternativa..."
                    style={{ margin: 0, flex: 1, padding: '0.4rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(optIndex)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ff4d4d',
                      cursor: 'pointer',
                    }}
                    title="Remover alternativa"
                  >
                    ✖
                  </button>
                </div>
              ))}
              {optionFields.length === 0 && (
                <span style={{ fontSize: '12px', color: 'gray', fontStyle: 'italic' }}>
                  Nenhuma alternativa adicionada.
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// COMPONENTE PRINCIPAL: Modal do Quiz
// ==========================================

interface CreateQuizModalProps {
  lessonId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateQuizModal({
  lessonId,
  onClose,
  onSuccess,
}: CreateQuizModalProps) {
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<QuizFormValues>({
    resolver: zodResolver(quizSchema),
    defaultValues: {
      title: '',
      questions: [
        {
          text: '',
          question_type: 'multiple_choice',
          weight: 1.0,
          options: [
            { text: '', is_correct: false },
            { text: '', is_correct: false },
          ],
        },
      ],
    },
  });

  const {
    fields: questionFields,
    append: appendQuestion,
    remove: removeQuestion,
    replace: replaceQuestions,
  } = useFieldArray({ control, name: 'questions' });

  const onSubmit = async (data: QuizFormValues) => {
    try {
      // Limpeza sanitária para o backend (o array 'options' existirá e passará no Zod)
      const sanitizedData: QuizFormValues = {
        ...data,
        questions: data.questions.map((q) => {
          if (q.question_type === 'open') {
            return { ...q, options: [] };
          }
          return q;
        }),
      };

      await api.post(`/lessons/${lessonId}/quizzes`, sanitizedData);
      toast.success('Avaliação criada com sucesso!', { icon: '📝' });
      onSuccess();
      onClose();
    } catch (error) {
      if (isAxiosError(error)) {
        toast.error(error.response?.data?.detail || 'Erro ao criar avaliação.');
      } else {
        toast.error('Erro inesperado ao salvar a avaliação.');
      }
    }
  };

  const handleAIGenerate = async () => {
    setIsGeneratingAI(true);
    try {
      const res = await api.post<AIQuizSchema>(
        `/lessons/${lessonId}/quizzes/ai-generate`
      );
      const generated = res.data;

      setValue('title', generated.title, { shouldValidate: true });

      replaceQuestions(
        generated.questions.map((q) => ({
          text: q.text,
          question_type: q.question_type as 'multiple_choice' | 'open',
          weight: q.weight,
          options: q.options.map((opt) => ({
            text: opt.text,
            is_correct: opt.is_correct,
          })),
        }))
      );

      toast.success(
        `${generated.questions.length} questões geradas! Revise e publique.`,
        { icon: '✨', duration: 5000 }
      );
    } catch (error) {
      if (isAxiosError(error)) {
        const httpStatus = error.response?.status;
        if (httpStatus === 400) {
          toast.error(
            'A aula não possui conteúdo suficiente. Adicione a transcrição ou o resumo da aula antes de usar o AI Quiz Builder.',
            { duration: 6000 }
          );
        } else if (httpStatus === 503) {
          toast.error(
            'Serviço de IA temporariamente indisponível. Tente novamente em instantes.',
            { duration: 5000 }
          );
        } else {
          toast.error(
            error.response?.data?.detail || 'Erro ao gerar questões com IA.'
          );
        }
      } else {
        toast.error('Erro inesperado na generation de questões pela IA.');
      }
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const isBusy = isSubmitting || isGeneratingAI;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: 'var(--bg)',
          padding: '2rem',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '800px',
          border: '1px solid var(--border)',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '1.5rem',
            gap: '1rem',
          }}
        >
          <div>
            <h2 style={{ margin: '0 0 0.3rem 0', color: 'var(--text-h)' }}>
              Construir Avaliação
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text)' }}>
              Crie manualmente ou use a IA para gerar questões automaticamente.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text)',
              fontSize: '1.5rem',
              cursor: isBusy ? 'not-allowed' : 'pointer',
              flexShrink: 0,
              opacity: isBusy ? 0.5 : 1,
            }}
            title="Fechar"
          >
            ×
          </button>
        </div>

        <div
          style={{
            marginBottom: '1.5rem',
            padding: '1rem 1.2rem',
            background: 'var(--accent-bg)',
            border: '1px solid var(--accent-border)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.8rem',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 'bold',
                color: 'var(--text-h)',
                marginBottom: '2px',
              }}
            >
              ✨ AI Quiz Builder
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text)' }}>
              A IA lê o conteúdo/resumo da aula e gera questões automaticamente
              para revisão do professor antes da publicação.
            </div>
          </div>
          <button
            type="button"
            onClick={handleAIGenerate}
            disabled={isBusy}
            style={{
              background: isGeneratingAI ? 'var(--social-bg)' : 'var(--accent)',
              color: isGeneratingAI ? 'var(--text)' : 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '0.6rem 1.2rem',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: isBusy ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              opacity: isBusy ? 0.7 : 1,
            }}
          >
            {isGeneratingAI ? (
              <>
                <span
                  style={{
                    display: 'inline-block',
                    animation: 'spin 1s linear infinite',
                  }}
                >
                  ⏳
                </span>
                Analisando aula e gerando questões...
              </>
            ) : (
              '✨ Auto-gerar Questões com IA'
            )}
          </button>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            overflowY: 'auto',
            paddingRight: '0.5rem',
            flex: 1,
          }}
        >
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              Título do Questionário <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              {...register('title')}
              placeholder="Ex: Prova Final de Algoritmos"
              className="counter"
              style={{ width: '100%', margin: 0, fontSize: '16px', padding: '0.8rem' }}
            />
            {errors.title && (
              <span style={{ color: '#ff4d4d', fontSize: '12px' }}>
                {errors.title.message}
              </span>
            )}
          </div>

          <div
            style={{
              borderTop: '1px solid var(--border)',
              paddingTop: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3 style={{ margin: 0 }}>
                Questões
                {questionFields.length > 0 && (
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 'normal',
                      color: 'var(--text)',
                      marginLeft: '0.5rem',
                    }}
                  >
                    ({questionFields.length})
                  </span>
                )}
              </h3>
              <button
                type="button"
                onClick={() =>
                  appendQuestion({
                    text: '',
                    question_type: 'multiple_choice',
                    weight: 1.0,
                    options: [],
                  })
                }
                className="counter"
                style={{
                  margin: 0,
                  background: 'var(--social-bg)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                }}
              >
                + Nova Questão
              </button>
            </div>

            {errors.questions?.root && (
              <div style={{ color: '#ff4d4d', fontSize: '12px' }}>
                {errors.questions.root.message}
              </div>
            )}

            {questionFields.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '2.5rem',
                  background: 'var(--code-bg)',
                  borderRadius: '8px',
                  color: 'var(--text)',
                  border: '1px dashed var(--border)',
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
                <div style={{ fontSize: '14px' }}>
                  Nenhuma questão adicionada.
                  <br />
                  Use o <strong>AI Quiz Builder</strong> acima ou clique em{' '}
                  <strong>+ Nova Questão</strong>.
                </div>
              </div>
            ) : (
              questionFields.map((field, index) => (
                <QuestionItem
                  key={field.id}
                  control={control}
                  register={register}
                  index={index}
                  removeQuestion={removeQuestion}
                  errors={errors}
                  watch={watch}
                />
              ))
            )}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '1rem',
              marginTop: '1rem',
              position: 'sticky',
              bottom: 0,
              background: 'var(--bg)',
              padding: '1rem 0',
              borderTop: '1px solid var(--border)',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isBusy}
              className="counter"
              style={{
                margin: 0,
                background: 'transparent',
                border: '1px solid var(--border)',
                opacity: isBusy ? 0.6 : 1,
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isBusy}
              className="counter"
              style={{
                margin: 0,
                background: 'var(--accent)',
                color: 'white',
                border: 'none',
                padding: '0.8rem 2rem',
                fontWeight: 'bold',
                opacity: isBusy ? 0.7 : 1,
              }}
            >
              {isSubmitting ? 'Salvando Avaliação...' : 'Publicar Avaliação'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}