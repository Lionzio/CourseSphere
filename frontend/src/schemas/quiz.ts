// frontend/src/schemas/quiz.ts
import { z } from 'zod';

// ==========================================
// SCHEMAS DE FORMULÁRIO (Zod)
// ==========================================

const optionSchema = z.object({
  text: z.string().min(1, 'O texto da alternativa não pode estar vazio'),
  is_correct: z.boolean(),
});

const questionSchema = z.object({
  text: z.string().min(3, 'A questão deve ter no mínimo 3 caracteres'),
  question_type: z.enum(['multiple_choice', 'open']),
  weight: z.number().min(0.1, 'O peso mínimo é 0.1').max(100, 'O peso máximo é 100'),
  options: z.array(optionSchema),
});

export const quizSchema = z.object({
  title: z.string().min(3, 'O título deve ter no mínimo 3 caracteres'),
  questions: z.array(questionSchema).min(1, 'Adicione pelo menos uma questão ao questionário'),
});

// ==========================================
// INFERÊNCIA DE TIPOS (React Hook Form)
// ==========================================

export type OptionFormValues = z.infer<typeof optionSchema>;
export type QuestionFormValues = z.infer<typeof questionSchema>;
export type QuizFormValues = z.infer<typeof quizSchema>;

// ==========================================
// TIPOS DE RESPOSTA DA API
// ==========================================

export interface OptionResponse {
  id: number;
  question_id: number;
  text: string;
  is_correct: boolean;
}

export interface QuestionResponse {
  id: number;
  quiz_id: number;
  text: string;
  question_type: 'multiple_choice' | 'open';
  weight: number;
  options: OptionResponse[];
}

export interface QuizResponse {
  id: number;
  lesson_id: number;
  title: string;
  questions: QuestionResponse[];
}

/** Resposta individual do aluno — inclui campos de correção manual do professor */
export interface StudentAnswerResponse {
  id: number;
  question_id: number;
  selected_option_id: number | null;
  text_answer: string | null;
  /** null = múltipla escolha errada, true/false = auto-corrigida, null em questões abertas */
  is_correct: boolean | null;
  /** Nota de 0–100 atribuída pelo professor em questões abertas */
  manual_score: number | null;
  /** Comentário/justificativa do professor */
  teacher_feedback: string | null;
}

/** Status da máquina de estados da tentativa */
export type AttemptStatus = 'in_progress' | 'pending_correction' | 'graded';

export interface QuizAttemptResponse {
  id: number;
  user_id: number;
  quiz_id: number;
  /** null enquanto pendente de correção manual */
  score: number | null;
  status: AttemptStatus;
  started_at: string;
  completed_at: string | null;
  answers: StudentAnswerResponse[];
}

/** Payload de correção manual enviado pelo professor */
export interface QuizGradeUpdateItem {
  question_id: number;
  manual_score: number;
  teacher_feedback: string;
}

export interface QuizGradeUpdate {
  grades: QuizGradeUpdateItem[];
}